define([
    'some/module'
], function (
    someModule
) {
    'use strict';
    // Todo: PM-1234

    /**
     * TODO TK-4711: Give this class a proper name!
     * @constructor
     */
    var Klass = function () {
    };

    Klass.prototype.myMethod = function () {
        // TODO ABC-13
        return 42;
    };

    /**
     * TODO ABC-99
     */
    Klass.prototype.whatevs = function () {
    };

    // TODO ABC-99: what about someModule?!
    return Klass;
});
