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

  @zone:dashboard @task:030
  Scenario Outline: The dashboard header fits a <width>px wide screen
    Given I am signed in with an existing account
    And my screen is <width> pixels wide
    When I open "/dashboard"
    Then the page does not scroll sideways
    And every dashboard nav link is on screen

    Examples:
      | width |
      | 360   |
      | 768   |
      | 1024  |

  @zone:dashboard @task:030
  Scenario: A phone can go back to Home from the dashboard
    Given I am signed in with an existing account
    And my screen is 360 pixels wide
    When I open "/dashboard"
    And I follow the "Home" link
    Then I see the heading "Waypoint"
