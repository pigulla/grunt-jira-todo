/*
 * grunt-jira-todo
 * https://github.com/pigulla/grunt-jira-todo
 *
 * Copyright (c) 2014 Raphael Pigulla
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {
    // Project configuration.
    grunt.initConfig({
        jiraConfig: grunt.file.readJSON('jira-config.json'),

        jshint: {
            all: [
                'Gruntfile.js',
                'tasks/*.js',
                '<%= nodeunit.tests %>'
            ],
            options: {
                jshintrc: '.jshintrc'
            }
        },

        // Before generating any new files, remove any previously-created files.
        clean: {
            tests: ['tmp']
        },

        // Configuration to be run (and then tested).
        'jira-todo': {
            default_options: {
                options: {
                    projects: ['ABC']
                },
                files: {
                    'tmp/default_options': ['test/fixtures/testing.js']
                }
            },
            custom_options: {
                options: {
                    projects: ['PM'],
                    allowedStatuses: [1, 3, 10023, 10024],
                    jiraUrl: '<%= jiraConfig.url %>',
                    jiraUsername: '<%= jiraConfig.username %>',
                    jiraPassword: '<%= jiraConfig.password %>'
                },
                src: ['test/fixtures/testing.js']
            },
            tuerue: {
                options: {
                    projects: ['PM'],
                    allowedStatuses: [1, 3, 10023, 10024],
                    jiraUrl: '<%= jiraConfig.url %>',
                    jiraUsername: '<%= jiraConfig.username %>',
                    jiraPassword: '<%= jiraConfig.password %>'
                },
                src: ['/home/pigullar/workspaces/tuerue/frontend/www/js/tuerue/**/*.js']
            }
        },

        // Unit tests.
        nodeunit: {
            tests: ['test/*_test.js']
        }
    });

    // Actually load this plugin's task(s).
    grunt.loadTasks('tasks');

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-nodeunit');

    // Whenever the "test" task is run, first clean the "tmp" dir, then run this
    // plugin's task(s), then test the result.
    grunt.registerTask('test', ['clean', 'jira-todo', 'nodeunit']);

    // By default, lint and run all tests.
    grunt.registerTask('default', ['jshint', 'test']);

};
