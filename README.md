[![NPM version](http://img.shields.io/npm/v/grunt-jira-todo.svg?style=flat-square)](http://badge.fury.io/js/grunt-jira-todo)
[![Dependency Status](https://david-dm.org/pigulla/grunt-jira-todo.svg?style=flat-square)](https://david-dm.org/pigulla/grunt-jira-todo)
[![devDependency Status](https://david-dm.org/pigulla/grunt-jira-todo/dev-status.svg?style=flat-square)](https://david-dm.org/pigulla/grunt-jira-todo#info=devDependencies)

# grunt-jira-todo 0.1.3

> Check your JavaScript source files for comments containing TODOs that reference Jira issues. Causes warnings if the status of a referenced issue is "Open" (or any other number of configurable statuses).

## Example Output
![Example Output](https://raw.githubusercontent.com/pigulla/grunt-jira-todo/master/screenshot.png)

## Getting Started
This plugin requires Grunt `~0.4.0`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-jira-todo --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-jira-todo');
```

## The "jira-todo" task

### Overview
In your project's Gruntfile, add a section named `jira-todo` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  'jira-todo': {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
});
```

### Options

#### options.projects
Type: `Array`  
Default value: `[]`

An array of strings specifying the keys of Jira projects you want to check against. For example, if your application is referencing the issues `MA-123` and `PT-99`, set this to `['MA', 'PT']`. Any other issue keys (e.g. `ABC-42`) will be ignored.

#### options.allowedStatuses
Type: `Array`  
Default value: `[1]`

An array of ids that specifies which statuses are allowed for issues that are referenced from a todo. The default `1` corresponds to the standard Jira issue status `Open`.

#### options.regex
Type: `String`  
Default value: `'todo(?::|\\s).*?(?<key>(?<project>[A-Z][_A-Z0-9]*)-(?<number>\\d+))'`

By default this plugin matches issue keys that are preceded by `"todo"` followed by a colon or whitespace, ignoring case. You can tweak this expression as needed, as long as you keep the named groups `key`, `project` and `number`.  The flags `g` (global) and `i` (ignore case) are added automatically. Please refer to the [XRegExp](http://xregexp.com/) documentation for further details.

#### options.jiraUrl
Type: `String`  
Default value: _none_

The URL of the Jira server, e.g. `'https://jira.example.com'`. The path for the REST endpoint (i.e. `'/rest/api/2'`) will be added automatically.

#### options.jiraUsername
Type: `String`  
Default value: _none_

The username used for HTTP basic access authentication.

#### options.jiraPassword
Type: `String`  
Default value: _none_

The password used for HTTP basic access authentication.

### Usage Examples
```js
'jira-todo': {
    source: {
        options: {
            projects: ['PM'],
            allowedStatuses: [1, 3, 10023, 10024],
            jiraUrl: 'https://jira.example.com',
            jiraUsername: 'myusername',
            jiraPassword: 'mypassword' // (see Security Notes below!)
        },
        src: ['src/**/*.js']
    }
}
```

## Security Notes
It is strongly recommended not to put your Jira credentials in the Gruntfile. Instead, create a separate JSON file, add it to your `.gitignore` and read the username and password from there:

```js
grunt.initConfig({
    jiraConfig: grunt.file.readJSON('jira-config.json'),
    // ...
    'jira-todo': {
        source: {
            options: {
                projects: ['ABC', 'DEF'],
                allowedStatuses: [1, 3],
                jiraUrl: 'https://jira.example.com',  // you may even want to hide that as well
                jiraUsername: '<%= jiraConfig.username %>',
                jiraPassword: '<%= jiraConfig.password %>'
            },
            src: ['src/**/*.js']
        }
    }
});
```
Also, make sure you use a secure connection (i.e. https) to protect your username and password.  

## Contributing
In lieu of a formal style guide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
 * 2014-10-02   v0.1.3   Improved regex and bumped dependency versions.
 * 2014-04-24   v0.1.2   Improved error handling for configuration and source code documentation.
 * 2014-04-22   v0.1.1   Fixed minor issues with the README and Grunt tasks, changelog added.
 * 2014-04-19   v0.1.0   Initial release.
