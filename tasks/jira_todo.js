/*
 * grunt-jira-todo
 * https://github.com/pigulla/grunt-jira-todo
 *
 * Copyright (c) 2014 Raphael Pigulla
 * Licensed under the MIT license.
 */

'use strict';

var util = require('util');

var _ = require('lodash'),
    async = require('async'),
    esprima = require('esprima'),
    estraverse = require('estraverse'),
    request = require('request'),
    XRegExp = require('xregexp').XRegExp;

module.exports = function (grunt) {
    var JiraTodo = function (options) {
        this.opts = options;
        this.regex = XRegExp(
            'todo:?\\s*(?<key>(?<project>[A-Z][_A-Z0-9]*)-(?<number>\\d+))',
            'gi'
        );

        if (this.opts.projects.length === 0) {
            grunt.log.warn('You have not specified any projects.');
        }
    };

    JiraTodo.prototype.processFile = function (file, callback) {
        grunt.verbose.writeln('Processing file ' + file);

        var issues = this.extractTodosFromFile(file),
            relevantIssues = issues.filter(function (issue) {
                return this.opts.projects.indexOf(issue.project) !== -1;
            }.bind(this));

        grunt.verbose.writeln(util.format(
            'File %s has %d todos with issues of which %d belonged to configured projects.',
            file, issues.length, relevantIssues.length
        ));

        return relevantIssues;
//        this.getJiraStatusForIssues(relevantIssues, callback);
    };

    JiraTodo.prototype.extractTodosFromFile = function (file) {
        var self = this,
            result = [],
            source = grunt.file.read(file),
            ast = esprima.parse(source, {
                loc: true,
                comment: true
            });

        estraverse.traverse(ast, {
            enter: function (node) {
                (node.comments || []).forEach(function (commentNode) {
                    self.parseString(commentNode.value).forEach(function (issue) {
                        result.push(_.extend(issue, {
                            file: file,
                            loc: commentNode.loc
                        }));
                    });
                });
            }
        });

        return result;
    };

    JiraTodo.prototype.parseString = function (string) {
        var result = [];

        XRegExp.forEach(string, this.regex, function (matches) {
            result.push({
                key: matches.key,
                project: matches.project,
                number: matches.number
            });
        });

        return result;
    };

    JiraTodo.prototype.getJiraStatusForIssues = function (issueKeys, callback) {
        var result = {};

        async.eachLimit(issueKeys, 3, function (issueKey, cb) {
            var url = this.opts.jira.url + '/rest/api/2/issue/' + issueKey;

            grunt.verbose.writeln('Sending request to ' + url);
            result[issueKey] = null;

            request({
                url: url,
                method: 'GET',
                auth: {
                    username: this.opts.jira.username,
                    password: this.opts.jira.password
                }
            }, function (err, response, body) {
                if (err) {
                    grunt.fail.warn('Error retrieving status for %s: %s', issueKey, err.toString());
                    return cb();
                }

                var data;

                try {
                    data = JSON.parse(body);
                } catch (e) {
                    grunt.fail.warn(util.format('Error parsing JSON response: "%s"', e.message));
                    return cb();
                }

                if (data.errorMessages) {
                    grunt.fail.warn(util.format(
                        'Error getting status for %s: "%s"', issueKey, data.errorMessages[0]
                    ));
                    return cb();
                }

                result[issueKey] = {
                    id: parseInt(data.fields.status.id, 10),
                    name: data.fields.status.name
                };
                cb();
            });
        }.bind(this), function () {
            callback(null, result);
        });
    };

    grunt.registerMultiTask('jira_todo', 'Check statuses of TODOs referencing Jira tasks.', function () {
        var done = this.async();

        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
                projects: [],
                allowedStatuses: [1, 3]
            }),
            gjt = new JiraTodo({
                projects: options.projects,
                allowedStatuses: options.allowedStatuses,
                jira: {
                    url: options.jiraUrl,
                    username: options.jiraUsername,
                    password: options.jiraPassword
                }
            });

        var issues = this.filesSrc.reduce(function (list, file) {
                return list.concat(gjt.processFile(file));
            }, []),
            uniqIssueKeys = _.uniq(issues.map(function (issue) {
                return issue.key;
            }));

        gjt.getJiraStatusForIssues(uniqIssueKeys, function (err, statuses) {
            issues.forEach(function (issue) {
                var status = statuses[issue.key];
                if (status !== null && options.allowedStatuses.indexOf(status.id) === -1) {
                    grunt.fail.warn(util.format(
                        'File "%s" has a todo for issue %s (issue status: "%s")',
                        issue.file, issue.key, status.name
                    ));
                }
            });

            done(true);
        });
    });

};
