@zone:dashboard
Feature: Customer links
  As a signed-in user
  I want projects and tasks to point at the customer they are for
  So that I can see everything we did for a customer in one place

  Background:
    Given I am signed in with an existing account
    And I have a customer "Acme Ltd" with status "Active" and tags "retail"

  @task:016
  Scenario: A project for a customer shows on the customer's page
    When I open "/dashboard/projects/new"
    And I fill in "Project name" with "Website Redesign"
    And I select "Acme Ltd" from "Customer"
    And I press "Create Project"
    And I am on the "Website Redesign" project page
    Then I see the "Acme Ltd" link
    When I am on the "Acme Ltd" customer page
    Then the "Projects" section shows "Website Redesign"

  @task:016
  Scenario: Deleting a customer keeps its projects
    Given I have a project named "Website Redesign" for customer "Acme Ltd"
    When I delete the customer "Acme Ltd"
    And I am on the "Website Redesign" project page
    Then I see the text "No customer"

  @task:017
  Scenario: A task in an internal project can point at a customer
    Given I have a project named "Internal Ops"
    And I am on the "Internal Ops" project page
    And the project has a task "Call about invoice"
    And I am on the "Call about invoice" task page
    When I select "Acme Ltd" from "Customer"
    And I press "Save changes"
    Then I see the "Acme Ltd" link
    And "Acme Ltd" is selected in "Customer"
    When I am on the "Internal Ops" project page
    Then the task "Call about invoice" shows "Acme Ltd"

  @task:017
  Scenario: The customer page lists its open tasks from any project
    Given I have a project named "Internal Ops"
    And the project "Internal Ops" has a task "Call about invoice" for customer "Acme Ltd"
    When I am on the "Acme Ltd" customer page
    Then the "Open tasks" section shows "Call about invoice"

  @task:017
  Scenario: A task for a project's customer defaults to that customer
    Given I have a project named "Website Redesign" for customer "Acme Ltd"
    And I am on the "Website Redesign" project page
    And the project has a task "Write copy"
    When I am on the "Write copy" task page
    Then "Acme Ltd" is selected in "Customer"

  @task:020
  Scenario: A project card shows its customer
    Given I have a project named "Website Redesign" for customer "Acme Ltd"
    When I open "/dashboard/projects"
    Then the "Website Redesign" project card shows "For Acme Ltd"

  @task:020
  Scenario: Another user's customer can't be linked to a project
    Given another user has a customer named "Secret Corp"
    When I open "/dashboard/projects/new"
    And I fill in "Project name" with "Sneaky"
    And I choose the other user's customer in "Customer"
    And I press "Create Project"
    Then I see the error "Choose one of your customers"
    And I do not see the "Sneaky" link

  @task:020
  Scenario: Another user's customer can't be linked to a task
    Given another user has a customer named "Secret Corp"
    And I have a project named "Internal Ops"
    And I am on the "Internal Ops" project page
    And the project has a task "Call about invoice"
    And I am on the "Call about invoice" task page
    When I choose the other user's customer in "Customer"
    And I press "Save changes"
    Then I see the error "Choose one of your customers"
    And I see the text "No customer"

  @task:026
  Scenario: A customer from my other workspace can't be linked to a project
    Given I have a customer "Globex" in a new workspace named "Acme Team"
    And I switch to "Test User's workspace"
    When I open "/dashboard/projects/new"
    And I fill in "Project name" with "Sneaky"
    And I choose the customer from my other workspace in "Customer"
    And I press "Create Project"
    Then I see the error "Choose one of your customers"
    And I do not see the "Sneaky" link
