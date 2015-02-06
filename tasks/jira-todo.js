/*
 * grunt-jira-todo
 * https://github.com/pigulla/grunt-jira-todo
 *
 * Copyright (c) 2014 Raphael Pigulla
 * Licensed under the MIT license.
 */

'use strict';

var util = require('util'),
    JiraTodo = require('./lib/jira-todo-lib');

module.exports = function (grunt) {
    function validateOptions(options) {
        if (typeof options.issueRequired !== 'boolean') {
            grunt.fail.warn(util.format('Configuration option "%s" must be of type boolean.', 'issueRequired'));
        }

        ['todoRegex', 'issueRegex'].forEach(function (key) {
            if (options.hasOwnProperty(key) && typeof options[key] !== 'string') {
                grunt.fail.warn(util.format('Configuration option "%s" must be of type string.', key));
            }
        });
        
        ['allowedStatuses', 'allowedIssueTypes', 'projects'].forEach(function (name) {
            if (!Array.isArray(options.projects)) {
                grunt.fail.warn(util.format('Configuration option "%s" is missing or not an array.', name));
            }
        });

        ['jiraUrl', 'jiraUsername', 'jiraPassword'].forEach(function (name) {
            if (!options.hasOwnProperty(name)) {
                grunt.fail.warn(util.format('Configuration option "%s" is missing.', name));
            }
        });
    }
    
    grunt.registerMultiTask('jira-todo', 'Check statuses of TODOs referencing Jira tasks.', function () {
        var done = this.async(),
            options = this.options({
                projects: [],
                allowedStatuses: [1],
                allowedIssueTypes: [1, 3, 4, 5],
                issueRequired: false
            }),
            gjt;

        validateOptions(options);
        
        gjt = new JiraTodo(grunt, {
            projects: options.projects,
            todoRegex: options.todoRegex,
            issueRegex: options.issueRegex,
            allowedStatuses: options.allowedStatuses,
            allowedIssueTypes: options.allowedIssueTypes,
            jira: {
                url: options.jiraUrl,
                username: options.jiraUsername,
                password: options.jiraPassword
            }
        });

        gjt.processFiles(this.filesSrc, function (problems) {
            problems.forEach(function (problem) {
                if (problem.kind === 'statusForbidden') {
                    grunt.fail.warn(util.format(
                        'File "%s" has a todo for issue %s (issue status: "%s").',
                        problem.issue.file, problem.issue.key, problem.status.name
                    ));
                } else if (options.issueRequired) {
                    grunt.fail.warn(util.format(
                        'File "%s" has a todo without a specified issue near "%s".',
                        problem.issue.file, problem.issue.source.trim().substr(0, 25)
                    ));
                } else if (problem.kind === 'typeForbidden') {
                    grunt.fail.warn(util.format(
                        'File "%s" has a todo for an issue of disallowed type %d near "%s".',
                        problem.issue.file, problem.status.type, problem.issue.source.trim().substr(0, 25)
                    ));
                }
            });
            
            done(true);
        });
    });
};
