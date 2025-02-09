Feature: User Authentication

  Scenario: Successful login with remembered password
    Given I am on the login page
    And I have previously checked "Remember me"
    When I fill in "email" with "valid@example.com"
    And I click the "Login" button
    Then I should be redirected to the homepage

  Scenario: Unsuccessful login with invalid credentials
    Given I am on the login page
    And I have attempted to login 3 times
    When I fill in "email" with "invalid@example.com"
    And I fill in "password" with "wrongpassword"
    And I click the "Login" button
    Then I should see an error message

  Scenario: Successful login with two-factor authentication
    Given I am on the login page
    And I have enabled two-factor authentication
    When I fill in "email" with "valid@example.com"
    And I fill in "password" with "valid_password"
    And I enter the correct authentication code
    And I click the "Login" button
    Then I should be redirected to the homepage

  Scenario: Locked account due to multiple failed login attempts
    Given I am on the login page
    And I have attempted to login more than the allowed number of times
    When I fill in "email" with "locked_account@example.com"
    And I fill in "password" with "wrongpassword"
    And I click the "Login" button
    Then I should see a message indicating the account is locked