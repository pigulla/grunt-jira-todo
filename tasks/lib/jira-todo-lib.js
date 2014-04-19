'use strict';

var util = require('util');

var _ = require('lodash'),
    async = require('async'),
    esprima = require('esprima'),
    estraverse = require('estraverse'),
    request = require('request'),
    xregexp = require('xregexp').XRegExp;

function JiraTodo(grunt, options) {
    _.defaults(options, {
        regex: 'todo:?\\s*(?<key>(?<project>[A-Z][_A-Z0-9]*)-(?<number>\\d+))'
    });

    this.grunt = grunt;
    this.opts = options;
    this.regex = xregexp(options.regex, 'gi');

    if (!this.opts.projects || !this.opts.projects.length) {
        this.grunt.log.warn('You have not specified any projects.');
    }
}

JiraTodo.prototype.processFiles = function (files, callback) {
    var self = this,
        issues = files.reduce(function (list, file) {
            return list.concat(self.getIssuesForFile(file));
        }, []),
        issueKeys = _.pluck(issues, 'key');

    this.getJiraStatusForIssues(issueKeys, function (err, statuses) {
        var problems = [];
        issues.forEach(function (issue) {
            var status = statuses[issue.key];
            if (status !== null && self.opts.allowedStatuses.indexOf(status.id) === -1) {
                problems.push({ issue: issue, status: status });
            }
        });
        callback(problems);
    });
};

JiraTodo.prototype.getIssuesForFile = function (file) {
    this.grunt.verbose.writeln('Processing file ' + file);

    var issues = this.extractTodosFromFile(file),
        relevantIssues = issues.filter(function (issue) {
            return this.opts.projects.indexOf(issue.project) !== -1;
        }.bind(this));

    this.grunt.verbose.writeln(util.format(
        'File %s has %d todos with issues of which %d belonged to configured projects.',
        file, issues.length, relevantIssues.length
    ));

    return relevantIssues;
};

JiraTodo.prototype.extractTodosFromFile = function (file) {
    var self = this,
        result = [],
        source = this.grunt.file.read(file),
        ast = esprima.parse(source, {
            comment: true
        });

    estraverse.traverse(ast, {
        enter: function (node) {
            (node.comments || []).forEach(function (commentNode) {
                self.parseString(commentNode.value).forEach(function (issue) {
                    result.push(_.extend(issue, {
                        file: file
                    }));
                });
            });
        }
    });

    return result;
};

JiraTodo.prototype.parseString = function (string) {
    var result = [];

    xregexp.forEach(string, this.regex, function (matches) {
        result.push({
            key: matches.key,
            project: matches.project,
            number: parseInt(matches.number, 10)
        });
    });

    return result;
};

JiraTodo.prototype.getJiraStatusForIssues = function (issueKeys, callback) {
    var result = {};

    async.eachLimit(_.uniq(issueKeys), 3, function (issueKey, cb) {
        var url = this.opts.jira.url + '/rest/api/2/issue/' + issueKey;

        this.grunt.verbose.writeln('Sending request to ' + url);
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
                this.grunt.fail.warn(util.format(
                    'Error retrieving status for issue "%s": "%s"',
                    issueKey, err.toString()
                ));
                return cb();
            }

            if (response.statusCode >= 400) {
                this.grunt.fail.warn(util.format(
                    'Request to Jira for issue "%s" failed with status code %d.',
                    issueKey, response.statusCode
                ));
                return cb();
            }

            var data;

            try {
                data = JSON.parse(body);
            } catch (e) {
                this.grunt.fail.warn(util.format(
                    'Error parsing JSON response for issue "%s": "%s"',
                    issueKey, e.message
                ));
                return cb();
            }

            if (data.errorMessages) {
                this.grunt.fail.warn(util.format(
                    'Error getting status for issue "%s": "%s"',
                    issueKey, data.errorMessages[0]
                ));
                return cb();
            }

            result[issueKey] = {
                id: parseInt(data.fields.status.id, 10),
                name: data.fields.status.name
            };
            cb();
        }.bind(this));
    }.bind(this), function () {
        callback(null, result);
    });
};

module.exports = JiraTodo;
