@zone:dashboard @task:046
Feature: Roles: admins and auditors
  As a workspace admin
  I want to let people see everything in the workspace without changing it
  So that auditors can check our work safely (ADR-0006)

  Background:
    Given I am signed in with an existing account
    And I have a customer "Acme Ltd" with status "Active" and tags "retail"
    And I have a project named "Website Redesign" for customer "Acme Ltd"
    And the project has a task "Write copy"

  Scenario: An auditor sees every project and customer
    Given an auditor joins my workspace
    Then the auditor sees the "Website Redesign" project with the customer "Acme Ltd" and the task "Write copy"
    And the auditor sees the "Acme Ltd" customer with its details

  @slow
  Scenario: An auditor can't change anything
    Given an auditor joins my workspace
    Then the auditor sees no "New project" link on "/dashboard/projects"
    And the auditor sees no "Edit project" link or "Add task" button on the "Website Redesign" project
    And the auditor sees no "New customer" link on "/dashboard/customers"
    And the auditor opening "/dashboard/projects/new" sees "This page could not be found."
    And the auditor opening the "Website Redesign" project's "edit" page sees "Project not found"

  @slow
  Scenario: An auditor's forms are refused
    Given an auditor joins my workspace
    When the auditor posts the edit form of the "Website Redesign" project with the name "Renamed"
    Then the "Website Redesign" project is still named "Website Redesign"

  Scenario: Admins invite admins or auditors
    When I open "/dashboard/workspace"
    Then the "Role" select offers "Admin, Auditor" with "Auditor" chosen

  Scenario: A teammate invited as an admin joins as an admin
    Given I create an invite link for the role "Admin"
    And a teammate joins with the invite link
    When I open "/dashboard/workspace"
    Then the "Teammate" row shows the role "Admin"

  Scenario: An auditor sees the members list without controls
    Given an auditor joins my workspace
    Then the auditor sees "Test User" in the members list
    And the auditor sees no "Remove" button, role select or invite form on the members page
