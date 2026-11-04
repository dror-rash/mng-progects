@zone:shell @task:000
Feature: Navigate between zones
  As a visitor
  I want to move between parts of the app seamlessly
  So that separately deployed zones feel like one product

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
