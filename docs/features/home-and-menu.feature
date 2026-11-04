@zone:shell
Feature: The dashboard is home, with a short menu
  As someone using the app
  I want to land on the dashboard and see only the main pages in the menu
  So that the flow from customers to sites to projects is simple to follow

  @task:070
  @smoke
  Scenario: Opening the home address signed out shows the login page, and logging in lands on the overview
    Given an existing account
    And I am on the home page
    Then I am sent to the login page
    And I see the heading "Welcome back"
    When I log in with my email and password
    Then the URL path is "/dashboard"
    And I see the heading "Overview"

  @task:070
  Scenario: Opening the home address signed in shows the overview
    Given I am signed in with an existing account
    And I am on the home page
    Then the URL path is "/dashboard"
    And I see the heading "Overview"
    And I see my email address

  @task:070 @zone:dashboard
  Scenario: The menu is Overview, All projects and Customers
    Given I am signed in with an existing account
    When I open "/dashboard"
    Then the dashboard menu links are "Overview, All projects, Customers"
    And I do not see the "Home" link
    And I do not see the "Example zone" link

  @task:070 @zone:dashboard
  Scenario: Pages left out of the menu still open by their address
    Given I am signed in with an existing account
    When I open "/dashboard/partners"
    Then I see the heading "Partners"
    When I open "/dashboard/my-tasks"
    Then I see the heading "My tasks"
    When I open "/dashboard/deleted"
    Then I see the heading "Deleted items"
