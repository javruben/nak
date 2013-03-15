// filched mostly from https://github.com/andreyvit/pathspec.js
// given the ignore rules, creates an array of regexps to test files against
var Minimatch = require("minimatch").Minimatch;

function Ignorer(exclusions, length) {
  // makeRegExp = function(wildcard) {
  //   // if the rule has an asterisk, escape the segment and swap * for .?
  //   return new RegExp(escapeRegExp(wildcard).replace(/\\\*/g, ".?"));
  // };

  // var r = 0, rules = [];
  // while (r < length) rules.push(makeRegExp(exclusions[r++]));

  // now get a minimatch object for each one of these.
  // Note that we need to allow dot files by default, and
  // not switch the meaning of their exclusion
  var mmopt = { matchBase: true, dot: true, flipNegate: true };
  this.ignoreRules = exclusions.map(function (s) { return new Minimatch(s, mmopt); })
}

Ignorer.prototype.isIgnored = function(entry, partial, showHidden) {
  var included = true

  // this = /a/b/c
  // entry = d
  // parent /a/b sees c/d
  if (this.parent && this.parent.applyIgnores) {
    var pt = this.basename + "/" + entry
    included = this.parent.applyIgnores(pt, partial)
  }

  // Negated Rules
  // Since we're *ignoring* things here, negating means that a file
  // is re-included, if it would have been excluded by a previous
  // rule.  So, negated rules are only relevant if the file
  // has been excluded.
  //
  // Similarly, if a file has been excluded, then there's no point
  // trying it against rules that have already been applied
  //
  // We're using the "flipnegate" flag here, which tells minimatch
  // to set the "negate" for our information, but still report
  // whether the core pattern was a hit or a miss.

  if (!this.ignoreRules) {
    return included
  }

  this.ignoreRules.forEach(function (rule) {
    // negation means inclusion
    if (rule.negate && included ||
        !rule.negate && !included) {
      // unnecessary
      return
    }

    // first, match against /foo/bar
    var match = rule.match("/" + entry)

    if (!match) {
      // try with the leading / trimmed off the test
      // eg: foo/bar instead of /foo/bar
      match = rule.match(entry)
    }

    // if the entry is a directory, then it will match
    // with a trailing slash. eg: /foo/bar/ or foo/bar/
    if (!match && partial) {
      match = rule.match("/" + entry + "/") ||
              rule.match(entry + "/")
    }
 
    // When including a file with a negated rule, it's
    // relevant if a directory partially matches, since
    // it may then match a file within it.
    // Eg, if you ignore /a, but !/a/b/c
    if (!match && rule.negate && partial) {
      match = rule.match("/" + entry, true) ||
              rule.match(entry, true)
    }

    if (match) {
      included = rule.negate
    }
  }, this)

  return !included
}

// Ignorer.prototype.isFileIgnored = function(file, path, showHidden) {
//   if (!showHidden && (/^\.\w/.test(file))) {
//     return true;
//   }
    
//   return this.searchRulesFn(path);
// }

// Ignorer.prototype.isDirIgnored = function(path, showHidden) {
//   if (!showHidden && (/\/\.\w/.test(path))) {
//     return true;
//   }
    
//   return this.searchRulesFn(path);
// }

Ignorer.makeWildcardRegExp = function(str, fullConversion) {
  if (!str)
    return "";

  // remove all whitespace
  str = str.replace(/\s/g, "");
  str = escapeRegExp(str);

  // convert wildcard norms to regex ones     
  str = str.replace(/\\\*/g, ".*");
  str = str.replace(/\\\?/g, ".");

  if (fullConversion) {
    // we wants pipe seperation, not commas
    // (this is a regexp list with ORs)
    str = str.replace(/,/g, "|");

    str = new RegExp("(?:" + str + ")");

    return str;
  }

  return str;
};

var escapeRegExp = Ignorer.escapeRegExp = function(str) {
  return str.replace(/([\/'*+?|()\[\]{}.^$])/g, '\\$1');
}

module.exports = Ignorer;