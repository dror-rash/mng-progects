@zone:shell @task:000
Feature: Navigate between zones
  As a visitor
  I want to move between parts of the app seamlessly
  So that separately deployed zones feel like one product

  Scenario: Visitor opens the example zone from the shell
    Given I am on the home page
    When I follow the "Example zone" link
    Then the URL path is "/example"
    And I see the heading "Example zone"

  Scenario: Visitor returns to the shell from the example zone
    Given I am on the home page
    When I follow the "Example zone" link
    And I follow the "Back to shell" link
    Then I see the heading "Waypoint"
