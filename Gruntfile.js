/*
 * grunt-jira-todo
 * https://github.com/pigulla/grunt-jira-todo
 *
 * Copyright (c) 2014-2015 Raphael Pigulla
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {
    // Project configuration.
    grunt.initConfig({
        jiraConfig: grunt.file.readJSON('jira-config.example.json'),

        jshint: {
            all: [
                'Gruntfile.js',
                'tasks/**/*.js',
                'test/**/*.js'
            ],
            options: {
                jshintrc: true
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
            project: {
                options: {
                    projects: ['ABC'],
                    allowedStatuses: [1, 3],
                    jiraUrl: '<%= jiraConfig.url %>',
                    jiraUsername: '<%= jiraConfig.username %>',
                    jiraPassword: '<%= jiraConfig.password %>'
                },
                src: ['test/fixtures/testing.js']
            }
        }
    });

    grunt.loadTasks('tasks');

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-buster');

    grunt.registerTask('test', ['buster:tests']);
    grunt.registerTask('default', ['jshint', 'test']);
};
