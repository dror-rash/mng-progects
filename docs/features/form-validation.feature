@zone:dashboard @task:012
Feature: Form validation
  As a signed-in user
  I want clear messages when I leave a required field blank
  So that I can fix it without losing what I typed

  Background:
    Given I am signed in with an existing account

  Scenario: Blank project name when creating a project
    When I open "/dashboard/projects"
    And I fill in "Project name" with "   "
    And I fill in "Description" with "Keep this text"
    And I press "Create Project"
    Then I see the error "Project name is required"
    And the "Description" field contains "Keep this text"

  Scenario: Blank project name when editing a project
    Given I have a project named "Website Redesign"
    And I am on the "Website Redesign" project page
    When I follow the "Edit project" link
    And I fill in "Project name" with "   "
    And I press "Save changes"
    Then I see the error "Project name is required"

  Scenario: Blank task title
    Given I have a project named "Website Redesign"
    And I am on the "Website Redesign" project page
    When I fill in "Task title" with "   "
    And I press "Add task"
    Then I see the error "Task title is required"

  @task:020
  Scenario: A blank project name keeps the chosen customer
    Given I have a customer "Acme Ltd" with status "Active" and tags "retail"
    When I open "/dashboard/projects"
    And I select "Acme Ltd" from "Customer"
    And I fill in "Project name" with "   "
    And I press "Create Project"
    Then I see the error "Project name is required"
    And "Acme Ltd" is selected in "Customer"

  @task:020
  Scenario: An invalid customer email keeps the chosen status
    When I open "/dashboard/customers/new"
    And I fill in "Name" with "Acme Ltd"
    And I select "Lead" from "Status"
    And I fill in "Email" with "not-an-email"
    And I press "Save customer"
    Then I see the error "Enter a valid email address"
    And "Lead" is selected in "Status"

  @task:020
  Scenario: A blank task title keeps the chosen customer
    Given I have a customer "Acme Ltd" with status "Active" and tags "retail"
    And I have a project named "Internal Ops"
    And I am on the "Internal Ops" project page
    And the project has a task "Call about invoice"
    And I am on the "Call about invoice" task page
    When I select "Acme Ltd" from "Customer"
    And I fill in "Title" with "   "
    And I press "Save changes"
    Then I see the error "Task title is required"
    And "Acme Ltd" is selected in "Customer"
