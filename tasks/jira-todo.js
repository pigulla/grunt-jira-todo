/*
 * grunt-jira-todo
 * https://github.com/pigulla/grunt-jira-todo
 *
 * Copyright (c) 2014 Raphael Pigulla
 * Licensed under the MIT license.
 */

'use strict';

var _ = require('lodash'),
    util = require('util'),
    JiraTodo = require('./lib/jira-todo-lib');

module.exports = function (grunt) {
    grunt.registerMultiTask('jira-todo', 'Check statuses of TODOs referencing Jira tasks.', function () {
        var done = this.async(),
            options = this.options({
                projects: [],
                allowedStatuses: [1]
            }),
            gjt = new JiraTodo(grunt, {
                projects: options.projects,
                regex: options.regex,
                allowedStatuses: options.allowedStatuses,
                jira: {
                    url: options.jiraUrl,
                    username: options.jiraUsername,
                    password: options.jiraPassword
                }
            });

        gjt.processFiles(this.filesSrc, function (problems) {
            problems.forEach(function (problem) {
                grunt.fail.warn(util.format(
                    'File "%s" has a todo for issue %s (issue status: "%s")',
                    problem.issue.file, problem.issue.key, problem.status.name
                ));
            });
            done(true);
        });
    });
};
