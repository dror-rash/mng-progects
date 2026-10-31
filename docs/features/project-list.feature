@zone:dashboard @task:043
Feature: Project list
  As a signed-in user
  I want to see my projects in a table and narrow them down
  So that I can find the projects I need when there are many

  Background:
    Given I am signed in with an existing account
    And I have a customer "Acme Ltd" with status "Active" and tags "retail"
    And I have a project named "Website Redesign" for customer "Acme Ltd"
    And I have a project named "Internal Ops"

  Scenario: Projects show as a table, newest first
    Given I am on the "Website Redesign" project page
    And the project has a task "Write copy"
    And the project has a task "Ship it"
    And I move the task "Ship it" to "Done"
    When I open "/dashboard/projects"
    Then the projects shown are "Internal Ops, Website Redesign"
    And the "Website Redesign" row shows "Acme Ltd"
    And the "Website Redesign" row shows "In progress"
    And the "Website Redesign" row shows "1 of 2 done"
    And the "Internal Ops" row shows "No tasks"

  Scenario: Switching between table and tiles keeps the filters
    When I open "/dashboard/projects"
    And I select "Acme Ltd" from "Customer"
    Then the projects shown are "Website Redesign"
    When I follow the "Tiles" link
    Then the "Website Redesign" project card shows "For Acme Ltd"
    And I do not see the "Internal Ops" link
    When I follow the "Table" link
    Then the projects shown are "Website Redesign"

  Scenario: Projects without a customer
    When I open "/dashboard/projects"
    And I select "No customer" from "Customer"
    Then the projects shown are "Internal Ops"

  Scenario: Filtering by status
    Given I am on the "Internal Ops" project page
    And the project has a task "Order chairs"
    When I open "/dashboard/projects"
    And I select "Not started" from "Status"
    Then the projects shown are "Internal Ops"
    When I select "No tasks" from "Status"
    Then the projects shown are "Website Redesign"

  Scenario: Only projects with overdue tasks
    Given I am on the "Internal Ops" project page
    And the project has a task "Renew lease"
    And the task "Renew lease" is due 5 days ago
    When I open "/dashboard/projects"
    Then the "Internal Ops" row shows "1 overdue"
    When I check "Overdue only"
    Then the projects shown are "Internal Ops"

  Scenario: Searching by name combines with the other filters
    When I open "/dashboard/projects"
    And I search projects for "website"
    Then the projects shown are "Website Redesign"
    When I select "No customer" from "Customer"
    Then I see the text "No projects match these filters."
    When I follow the "Clear filters" link
    Then the projects shown are "Internal Ops, Website Redesign"

  Scenario: Unknown filters in a link are ignored
    When I open "/dashboard/projects?status=archived&customer=nobody"
    Then the projects shown are "Internal Ops, Website Redesign"

  @task:045
  Scenario: Sorting by a column and reversing it
    When I open "/dashboard/projects"
    Then the "Started" column is sorted "descending"
    When I sort projects by "Project"
    Then the projects shown are "Internal Ops, Website Redesign"
    And the "Project" column is sorted "ascending"
    When I sort projects by "Project"
    Then the projects shown are "Website Redesign, Internal Ops"
    And the "Project" column is sorted "descending"

  @task:045
  Scenario: Projects without a customer sort last
    When I open "/dashboard/projects"
    And I sort projects by "Customer"
    Then the projects shown are "Website Redesign, Internal Ops"
    When I sort projects by "Customer"
    Then the projects shown are "Website Redesign, Internal Ops"
    And the "Customer" column is sorted "descending"

  @task:045
  Scenario: Sorting by progress puts the furthest along first
    Given I am on the "Website Redesign" project page
    And the project has a task "Write copy"
    And the project has a task "Ship it"
    And I move the task "Ship it" to "Done"
    When I open "/dashboard/projects"
    And I sort projects by "Progress"
    Then the projects shown are "Website Redesign, Internal Ops"

  @task:045
  Scenario: The sort is kept when searching and switching views
    When I open "/dashboard/projects"
    And I sort projects by "Project"
    And I sort projects by "Project"
    And I search projects for "e"
    Then the projects shown are "Website Redesign, Internal Ops"
    When I follow the "Tiles" link
    And I follow the "Table" link
    Then the projects shown are "Website Redesign, Internal Ops"
    And the "Project" column is sorted "descending"

  @task:045
  Scenario: An unknown sort in a link is ignored
    When I open "/dashboard/projects?sort=budget&dir=sideways"
    Then the projects shown are "Internal Ops, Website Redesign"
    And the "Started" column is sorted "descending"
