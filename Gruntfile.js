'use strict';

module.exports = function( grunt ) {
  require( 'load-grunt-tasks' )( grunt );
  require( 'time-grunt' )( grunt );

  grunt.initConfig({
    jshint: {
      prod: {
        options: {
          jshintrc: true
        },
        files: {
          src: [
            '*.js'
          ]
        }
      }
    },

    jscs: {
      prod: {
        options: {
          config: '.jscsrc'
        },
        files: {
          src: [
            '*.js'
          ]
        }
      }
    }
  });
};
