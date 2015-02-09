'use strict';

var util = require('util');

var _ = require('lodash'),
    async = require('async'),
    esprima = require('esprima-fb'),
    estraverse = require('estraverse-fb'),
    request = require('request'),
    xregexp = require('xregexp').XRegExp;

var TODO_REGEX = '(?:\\*|\\s)?(todo|fixme)(?:!|:|\\s)(?<text>.+)',
    ISSUE_REGEX = '(?<key>(?<project>[A-Z][_A-Z0-9]*)-(?<number>\\d+))';

/**
 * @constructor
 * @class JiraTodo
 * @param {Grunt} grunt
 * @param {Object} options
 */
function JiraTodo(grunt, options) {
    _.defaults(options, {
        todoRegex: TODO_REGEX,
        issueRegex: ISSUE_REGEX
    });

    this.grunt = grunt;
    this.opts = options;
    this.todoRegex = xregexp(options.todoRegex, 'gi');
    this.issueRegex = xregexp(options.issueRegex, 'gi');

    if (this.opts.projects.length === 0) {
        this.grunt.log.warn('You have not specified any projects.');
    }
}

/**
 * Processes the list of files, extracts the todos, retrieves their status and returns any problems that were found.
 * Please note that the callback is not a Node-style callback since it will never fail. Any errors that are encountered
 * are handled through grunt.fail.warn() calls.
 * 
 * @param {Array.<string>} filenames
 * @param {function(Array.<Object>)} callback
 */
JiraTodo.prototype.processFiles = function (filenames, callback) {
    var self = this,
        allIssues = [],
        problems = [];

    filenames.forEach(function (file) {
        var issuesFound = this.getIssuesForFile(file);

        issuesFound.incomplete.forEach(function (issue) {
            problems.push({ issue: issue });
        });

        [].push.apply(allIssues, issuesFound.issues);
    }, this);

    this.getJiraStatusForIssues(_.pluck(allIssues, 'key'), function (err, statuses) {
        allIssues.forEach(function (issue) {
            var status = statuses[issue.key];
            if (status !== null && self.opts.allowedIssueTypes.indexOf(status.type) === -1) {
                problems.push({ kind: 'typeForbidden', issue: issue, status: status });
            } else if (status !== null && self.opts.allowedStatuses.indexOf(status.id) === -1) {
                problems.push({ kind: 'statusForbidden', issue: issue, status: status });
            }
        });

        callback(problems);
    });
};

/**
 * Returns all issues referenced in the given file.
 * 
 * @param {string} filename
 * @return {Object}
 */
JiraTodo.prototype.getIssuesForFile = function (filename) {
    this.grunt.verbose.writeln('Processing file ' + filename);

    var issues = this.extractTodosFromFile(filename),
        incompleteTodos = issues.filter(function (issue) {
            return !issue.hasOwnProperty('key');
        }, this),
        relevantIssues = issues.filter(function (issue) {
            return issue.hasOwnProperty('key') && this.opts.projects.indexOf(issue.project) !== -1;
        }, this);

    this.grunt.verbose.writeln(util.format(
        'File %s has %d todos with issues of which %d belonged to configured projects.',
        filename, issues.length, relevantIssues.length
    ));

    return {
        issues: relevantIssues,
        incomplete: incompleteTodos
    };
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
                        file: filename,
                        source: commentNode.value
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

    xregexp.forEach(string, this.todoRegex, function (todoMatches) {
        var referencedIssues = [];

        xregexp.forEach(todoMatches.text, this.issueRegex, function (issueMatches) {
            referencedIssues.push({
                key: issueMatches.key,
                project: issueMatches.project,
                number: parseInt(issueMatches.number, 10)
            });
        });

        [].push.apply(result, referencedIssues.length ? referencedIssues : [{}]);
    }, this);

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
                type: parseInt(data.fields.issuetype.id, 10),
                name: data.fields.status.name
            };
            cb();
        });
    }, function () {
        callback(null, result);
    });
};

module.exports = JiraTodo;
