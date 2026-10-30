@zone:shell @task:002
Feature: Shell Landing and Login Experience
  As a visitor or user
  I want a clear, attractive landing page and a secure login interface
  So that I understand the project management product and can sign in effortlessly

  Scenario: Visitor visits the landing page
    Given I am on the home page
    Then I see the heading "Waypoint"
    And I see the "Log in" link
    And I see the "Sign up" link

  Scenario: Visitor navigates from landing page to login
    Given I am on the home page
    When I follow the "Log in" link
    Then the URL path is "/login"
    And I see the heading "Welcome back"

  Scenario: Logged-in user views landing page
    Given I am signed in with an existing account
    And I am on the home page
    Then I see my email address

  @task:036
  Scenario: Choosing dark mode carries across zones and reloads
    Given I am signed in with an existing account
    And I am on the home page
    When I choose the "Dark" theme
    Then the page is dark
    When I follow the "Dashboard" link
    Then the page is dark
    When I reload the page
    Then the page is dark

  @task:036
  Scenario: The system theme follows the OS setting
    Given my system prefers a dark color scheme
    And I am on the home page
    When I choose the "System" theme
    Then the page is dark
    When I reload the page
    Then the page is dark

  @task:036
  Scenario: Choosing light mode overrides a dark OS setting
    Given my system prefers a dark color scheme
    And I am on the home page
    When I choose the "Light" theme
    Then the page is light
    When I reload the page
    Then the page is light
