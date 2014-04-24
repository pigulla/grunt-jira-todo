'use strict';

var util = require('util');

var _ = require('lodash'),
    async = require('async'),
    esprima = require('esprima'),
    estraverse = require('estraverse'),
    request = require('request'),
    xregexp = require('xregexp').XRegExp;

/**
 * @constructor
 * @class JiraTodo
 * @param {Grunt} grunt
 * @param {Object} options
 */
function JiraTodo(grunt, options) {
    _.defaults(options, {
        regex: 'todo:?\\s*(?<key>(?<project>[A-Z][_A-Z0-9]*)-(?<number>\\d+))'
    });

    this.grunt = grunt;
    this.opts = options;
    this.regex = xregexp(options.regex, 'gi');

    if (this.opts.projects.length === 0) {
        this.grunt.log.warn('You have not specified any projects.');
    }
}

/**
 * Processes the list of files, extracts the todos, retreives their status and returns any problems that were found.
 * Please note that the callback is not a Node-style callback since it will never fail. Any errors that are encountered
 * are handled through grunt.fail.warn() calls.
 * 
 * @param {Array.<string>} filenames
 * @param {function(Array.<Object>)} callback
 */
JiraTodo.prototype.processFiles = function (filenames, callback) {
    var self = this,
        issues = filenames.reduce(function (list, file) {
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

/**
 * Returns all issues referenced in the given file.
 * 
 * @param {string} filename
 * @return {Array.<Object>}
 */
JiraTodo.prototype.getIssuesForFile = function (filename) {
    this.grunt.verbose.writeln('Processing file ' + filename);

    var issues = this.extractTodosFromFile(filename),
        relevantIssues = issues.filter(function (issue) {
            return this.opts.projects.indexOf(issue.project) !== -1;
        }.bind(this));

    this.grunt.verbose.writeln(util.format(
        'File %s has %d todos with issues of which %d belonged to configured projects.',
        filename, issues.length, relevantIssues.length
    ));

    return relevantIssues;
};

/**
 * Reads the given file and extracts all todos matching the configured regular expression.
 * 
 * @param {string} filename
 * @return {Array.<Object>}
 */
JiraTodo.prototype.extractTodosFromFile = function (filename) {
    var self = this,
        result = [],
        source = this.grunt.file.read(filename),
        ast = esprima.parse(source, {
            comment: true
        });

    estraverse.traverse(ast, {
        enter: function (node) {
            (node.comments || []).forEach(function (commentNode) {
                self.parseString(commentNode.value).forEach(function (issue) {
                    result.push(_.extend(issue, {
                        file: filename
                    }));
                });
            });
        }
    });

    return result;
};

/**
 * Parses the given string and returns all todos matching the configured regular expression.
 * 
 * @param {string} string
 * @return {Array.<Object>}
 */
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

/**
 * Returns the statuses for the given Jira issues.
 * 
 * @param {Array.<string>} issueKeys
 * @param {function} callback
 */
JiraTodo.prototype.getJiraStatusForIssues = function (issueKeys, callback) {
    var result = {},
        self = this;

    async.eachLimit(_.uniq(issueKeys), 3, function (issueKey, cb) {
        var url = self.opts.jira.url + '/rest/api/2/issue/' + issueKey;

        self.grunt.verbose.writeln('Sending request to ' + url);
        result[issueKey] = null;

        request({
            url: url,
            method: 'GET',
            auth: {
                username: self.opts.jira.username,
                password: self.opts.jira.password
            }
        }, function (err, response, body) {
            var data;
            
            if (err) {
                self.grunt.fail.warn(util.format(
                    'Error retrieving status for issue "%s": "%s".',
                    issueKey, err.toString()
                ));
                return cb();
            }

            if (response.statusCode >= 400) {
                self.grunt.fail.warn(util.format(
                    'Request to Jira for issue "%s" failed with status code %d.',
                    issueKey, response.statusCode
                ));
                return cb();
            }

            try {
                data = JSON.parse(body);
            } catch (e) {
                self.grunt.fail.warn(util.format(
                    'Error parsing JSON response for issue "%s": "%s".',
                    issueKey, e.message
                ));
                return cb();
            }

            if (data.errorMessages) {
                self.grunt.fail.warn(util.format(
                    'Error getting status for issue "%s": "%s".',
                    issueKey, data.errorMessages[0]
                ));
                return cb();
            }

            result[issueKey] = {
                id: parseInt(data.fields.status.id, 10),
                name: data.fields.status.name
            };
            cb();
        });
    }, function () {
        callback(null, result);
    });
};

module.exports = JiraTodo;
