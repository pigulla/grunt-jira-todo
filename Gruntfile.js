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

        buster: {
            tests: {
                test: {
                    config: 'test/buster.js'
                }
            }
        },

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
        }
    });

    grunt.loadTasks('tasks');

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-buster');

    grunt.registerTask('test', ['buster:tests']);
    grunt.registerTask('default', ['jshint', 'test']);
};
