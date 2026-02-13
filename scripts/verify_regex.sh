#!/bin/bash

match_test_runner() {
  local cmd="$1"
  if [[ "$cmd" =~ (^|[;\&\|[:space:]])npx[[:space:]]+(vitest|jest|playwright|cypress|mocha|ava|tape)([[:space:]]|$|\||&) ]] ||
     [[ "$cmd" =~ (^|[;\&\|[:space:]])npx[[:space:]]+playwright[[:space:]]+test([[:space:]]|$|\||&) ]]; then
    echo "MATCH: $cmd"
    return 0
  else
    echo "NO MATCH: $cmd"
    return 1
  fi
}

match_test_runner "npx playwright test"
match_test_runner "npx playwright install"
match_test_runner "npx cypress run"
match_test_runner "npx cypress open"
match_test_runner "npx vitest"
