# TwentyFive-JS

Twenty Five Card Game Library

[![worhello](https://circleci.com/gh/worhello/twentyfive-js.svg?style=svg)](https://app.circleci.com/pipelines/github/worhello/twentyfive-js)

A web app using this library can be tried out [here](https://worhello.github.io/TwentyFiveWeb/)!

This library aims to provide an implementation of the core Twenty Five card game rules, which can then be consumed in a server or client environment. As part of this, there are no raw `require` calls outside of tests. Instead modules are exposed either as modules or as objects in the `window` object, depending on whether the code is running (server or client).
