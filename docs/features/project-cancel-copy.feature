@zone:dashboard @task:050
Feature: Cancel a project, or copy it to a new one
  As an admin, or a user of a partner company
  I want to cancel a project, and to copy a project into a new one
  So that stopped work is marked, and work can move to another owner (a project's owner never changes, ADR-0006)

  # The same two-partner workspace as the leak suite (partner-access.feature), written straight to the
  # database; every check goes through the app. "I" am a user of Northwind.
  Background:
    Given a workspace with the partners "Northwind" and "Globex", an admin and an auditor
    And the customer "Acme Ltd" is assigned to "Northwind" and "Globex"
    And the customer "Initech" is assigned to "Globex"
    And "Northwind" has the project "NW Site" for "Acme Ltd" with the task "Homepage"
    And I am signed in as a user of "Northwind"

  Scenario: Cancelling a project shows it as Canceled
    Given "Northwind" has the project "NW Docs" for "Acme Ltd" with the task "Spec"
    When I am on the "NW Site" project page
    And I press "Cancel project"
    Then I see the text "Canceled"
    And I see the "Reopen project" button
    When I open "/dashboard/projects"
    Then the "NW Site" row shows "Canceled"
    And the "Status" select offers "Any status, No tasks, Not started, In progress, Done, Canceled" with "Any status" chosen
    When I select "Canceled" from "Status"
    Then the projects shown are "NW Site"
    When I select "Not started" from "Status"
    Then the projects shown are "NW Docs"

  Scenario: Reopening a canceled project
    Given the project "NW Site" is canceled
    When I am on the "NW Site" project page
    Then I see the text "Canceled"
    When I press "Reopen project"
    Then I see the "Cancel project" button
    When I open "/dashboard/projects"
    Then the "NW Site" row shows "Not started"

  Scenario: An admin copies a partner's project to another partner
    Given the task "Homepage" is in progress and assigned to the admin
    When the admin copies "NW Site" to "GX Site" owned by "Globex" for "Acme Ltd"
    Then the admin sees the project "GX Site", copied from "NW Site"
    And the admin sees the task "Homepage" in the "In progress" column
    When the admin opens the task "Homepage" of "GX Site"
    Then the admin sees the text "Unassigned"
    And the admin sees the "NW Site" project

  Scenario: A partner can only copy into their own partner
    When I am on the "NW Site" project page
    And I follow the "Copy to new project" link
    Then there is no "Owner" field
    And the "Project name" field contains "NW Site"
    And the "Customer" select offers "Acme Ltd" with "Acme Ltd" chosen
    When I fill in "Project name" with "NW Relaunch"
    And I press "Copy project"
    Then I see the heading "NW Relaunch"
    And I see the "NW Site" link
    And I see the text "Homepage"
    When I open "/dashboard/projects"
    Then the projects shown are "NW Relaunch, NW Site"

  Scenario: A task customer the new owner can't see is dropped in the copy
    Given "Globex" has the project "GX App" for "Acme Ltd" with the task "Login"
    And the task "Login" is about the customer "Initech"
    When the admin copies "GX App" to "NW App" owned by "Northwind" for "Acme Ltd"
    And the admin opens the task "Login" of "NW App"
    Then the admin sees the text "No customer"
    When I am on the "NW App" project page
    And I am on the "Login" task page
    Then I see the text "No customer"

  Scenario: An auditor can't cancel or copy
    When the auditor opens the "NW Site" project page
    Then the auditor sees no "Cancel project" button and no "Copy to new project" link
    When the auditor opens the copy page of "NW Site"
    Then the auditor sees "Project not found"
