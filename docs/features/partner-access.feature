@zone:dashboard @task:049
Feature: Partner access: a partner's user sees only their own partner's work
  As a user of a partner company
  I want to work on my partner's projects for the customers assigned to us
  So that we get our work done, and never see anything of another partner's (ADR-0006)

  # The workspace is written straight to the database (fast and the same every run); every check goes
  # through the app as a signed-in user. "I" am a user of Northwind. Later tasks add a scenario here for
  # each page or form they add.
  Background:
    Given a workspace with the partners "Northwind" and "Globex", an admin and an auditor
    And the customer "Acme Ltd" is assigned to "Northwind" and "Globex"
    And the customer "Initech" is assigned to "Globex"
    And the internal project "HQ Plan" has the task "Budget"
    And "Northwind" has the project "NW Site" for "Acme Ltd" with the task "Copy"
    And "Globex" has the project "GX App" for "Acme Ltd" with the task "Login"
    And I am signed in as a user of "Northwind"

  Scenario: Lists show only my partner's projects
    When I open "/dashboard/projects"
    Then the projects shown are "NW Site"
    And the "Customer" select offers "Any customer, No customer, Acme Ltd" with "Any customer" chosen
    And the page shows none of "GX App, Login, HQ Plan, Budget, Globex, Initech"
    When I select "Acme Ltd" from "Customer"
    Then the projects shown are "NW Site"
    When I search projects for "GX App"
    Then I see the text "No projects match these filters."
    When I open "/dashboard/projects?view=tiles"
    Then the project cards are "NW Site"
    And the page shows none of "GX App, Login, HQ Plan, Budget, Globex, Initech"

  Scenario: Home totals count only my projects
    When I open "/dashboard"
    Then the "Total Projects" stat shows "1"
    And the "Open Tasks" stat shows "1"
    And the "Tasks by status" chart shows "To do" as "1"
    And the recently started projects are "NW Site"
    And the page shows none of "GX App, Login, HQ Plan, Budget, Globex, Initech"

  Scenario: Another partner's project link is not found
    When I open the address of the "GX App" project
    Then I see "Project not found", the same as for a made-up project address
    When I open the address of the "Login" task
    Then I see "Task not found", the same as for a made-up task address
    When I open the address of the "HQ Plan" project
    Then I see "Project not found", the same as for a made-up project address

  Scenario: Another partner's ids in forms are refused
    When I add the task "Sneaky" on "NW Site" with the project id of "GX App"
    Then I see "Something went wrong", the same as with a made-up id
    When I create the project "Sneaky" with the customer id of "Initech"
    Then I see "Choose one of your customers", the same as with a made-up id
    When I save the task "Copy" with the assignee id of "Globex User"
    Then I see "Choose someone in this workspace", the same as with a made-up id
    When I save the task "Copy" with the customer id of "Initech"
    Then I see "Choose one of your customers", the same as with a made-up id
    And the admin sees the tasks of "GX App" are "Login"
    And the admin sees no project "Sneaky"
    And the admin sees the task "Copy" unassigned, for the customer "Acme Ltd"

  Scenario: I see customer names but no customer pages
    When I am on the "NW Site" project page
    Then I see the text "Acme Ltd"
    And I do not see the "Acme Ltd" link
    When I am on the "Copy" task page
    Then I see the text "Acme Ltd"
    And I do not see the "Acme Ltd" link
    And the header has no "Customers" link
    When I open "/dashboard/customers"
    Then I see the text "This page could not be found."
    When I open the address of the customer "Acme Ltd"
    Then I see "Customer not found", the same as for a made-up customer address

  Scenario: A task's customer that isn't mine shows as no customer
    Given the task "Copy" is about the customer "Initech"
    When I am on the "NW Site" project page
    Then the task "Copy" does not show "Initech"
    When I am on the "Copy" task page
    Then I see the text "No customer"
    And the page shows none of "Initech"
    When I fill in "Description" with "Shorter copy"
    And I press "Save changes"
    Then the admin sees the task "Copy" for the customer "Initech", with the description "Shorter copy"

  Scenario: I create a project for an assigned customer only
    When I open "/dashboard/projects/new"
    Then the "Customer" select offers "Acme Ltd" with "Acme Ltd" chosen
    And there is no "Owner" field
    When I fill in "Project name" with "NW App"
    And I press "Create Project"
    Then I see the heading "NW App"
    And I see the text "Acme Ltd"
    When I open "/dashboard/projects"
    Then the projects shown are "NW App, NW Site"

  Scenario: An admin chooses a project's owner
    When the admin opens "/dashboard/projects/new"
    Then the admin's "Owner" select offers "Internal, Globex, Northwind" with "Internal" chosen
    When the admin creates the project "NW Docs" for "Initech" owned by "Northwind"
    Then the admin sees the error "Choose a customer assigned to this partner"
    When the admin creates the project "NW Docs" for "Acme Ltd" owned by "Northwind"
    And I open "/dashboard/projects"
    Then the projects shown are "NW Docs, NW Site"

  Scenario: Only my partner's users and admins can be assigned
    When I am on the "NW Site" project page
    And I am on the "Copy" task page
    Then the "Assignee" select offers "Unassigned, Admin, Northwind User" with "Unassigned" chosen
    And the admin's "Assignee" options for the task "Copy" are "Unassigned, Admin, Northwind User"
    And the admin's "Assignee" options for the task "Budget" are "Unassigned, Admin"
    When the admin saves the task "Copy" with the assignee id of "Auditor"
    Then the admin sees the error "Choose someone in this workspace"

  Scenario: Taking a customer away hides its projects
    When the admin unassigns "Acme Ltd" from "Northwind"
    And I open "/dashboard/projects"
    Then I see the text "No projects yet."
    When I open the address of the "NW Site" project
    Then I see "Project not found", the same as for a made-up project address
    And the admin sees the "NW Site" project

  Scenario: Saving after the customer was taken away is refused
    Given I am on the edit page of the "NW Site" project
    When I fill in "Project name" with "Renamed"
    And the admin unassigns "Acme Ltd" from "Northwind"
    And I press "Save changes"
    Then I see the text "Something went wrong"
    And the admin sees the "NW Site" project

  Scenario: My tasks shows only what I can see
    Given the tasks "Copy, Login, Budget" are assigned to me directly
    And I am also an admin of my own workspace, with the task "Mine" assigned to me
    When I open "/dashboard/my-tasks"
    Then my tasks are "Copy, Mine"

  Scenario: An auditor sees both partners' projects
    When the auditor opens "/dashboard/projects"
    Then the auditor's projects are "GX App, NW Site, HQ Plan"

  @task:050
  Scenario: Another partner's project can't be copied
    When I copy the project "NW Site" as "Sneaky" with the project id of "GX App"
    Then I see "Something went wrong", the same as with a made-up id
    When I open the copy page of "GX App"
    Then I see "Project not found", the same as for a made-up project address
    And the admin sees no project "Sneaky"

  @task:050
  Scenario: Another partner's project can't be canceled
    When I cancel the project "NW Site" with the project id of "GX App"
    Then I see "Something went wrong", the same as with a made-up id
    And the admin sees the "GX App" row shows "Not started"

  @task:050
  Scenario: A copy doesn't show a project I can't see
    When the admin copies "GX App" to "NW Login" owned by "Northwind" for "Acme Ltd"
    And I am on the "NW Login" project page
    Then I see the text "Login"
    And the page shows none of "GX App, Copied from"
    When I open the edit page of "NW Login"
    Then the page source doesn't contain the id of "GX App"
    When I open the copy page of "NW Login"
    Then the page source doesn't contain the id of "GX App"
