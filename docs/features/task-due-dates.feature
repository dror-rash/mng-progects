@zone:dashboard @task:019
Feature: Task due dates
  As a signed-in user
  I want to give tasks due dates
  So that I can see what is late or coming up

  Background:
    Given I am signed in with an existing account
    And I have a project named "Website Redesign"
    And I am on the "Website Redesign" project page
    And the project has a task "Write copy"

  Scenario: Set and clear a due date
    Given I am on the "Write copy" task page
    When I set the due date to 10 days from today
    And I press "Save changes"
    Then I see the due date 10 days from today
    When I clear the due date
    And I press "Save changes"
    Then I see the text "No due date"

  Scenario: An open task past its due date is overdue, a done one is not
    Given the task "Write copy" is due 3 days ago
    When I am on the "Website Redesign" project page
    Then the task "Write copy" shows "Overdue"
    When I move the task "Write copy" to "Done"
    Then the task "Write copy" does not show "Overdue"

  Scenario: Home shows overdue and due-this-week counts
    Given the task "Write copy" is due 3 days ago
    And the project has a task "Pick fonts"
    And the task "Pick fonts" is due 3 days from today
    When I open "/dashboard"
    Then the "Overdue" stat shows "1"
    And the "Due This Week" stat shows "1"
