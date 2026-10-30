const test = require("node:test");
const assert = require("node:assert/strict");

function reverseString(str) {
  return str.split("").reverse().join("");
}

test("reverses a string correctly", () => {
  assert.equal(reverseString("hello"), "olleh");
  assert.equal(reverseString("MiniDash"), "hsaDiniM");
  assert.equal(reverseString(""), "");
});