@zone:<zone> @task:<NNN>
Feature: <Capability in user terms>
  As a <role>
  I want <goal>
  So that <benefit>

  Background:
    Given <shared precondition>

  Scenario: <Happy path, named by outcome>
    Given <context>
    When <the user does one thing>
    Then <observable result>

  Scenario: <Important failure or edge case>
    Given <context>
    When <action>
    Then <observable result>

  # Guidelines:
  # - Describe behavior, not UI mechanics ("submits the form", not "clicks #btn-3")
  # - One When per scenario
  # - Every Then must be observable by a user
