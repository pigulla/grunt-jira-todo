var buster = require('buster'),
    grunt = require('grunt'),
    JiraTodo = require('../tasks/jira-todo-lib');

buster.spec.expose();
expect = buster.expect;

describe('grunt-jira-todo', function () {
    var gruntMock,
        jtd;
    
    beforeEach(function () {
        jtd = new JiraTodo(gruntMock, {
            
        });
    });
    
    it('states the obvious', function (done) {
        var issues = jtd.processFile('fixtures/testing.js');
        done();
    });
});
