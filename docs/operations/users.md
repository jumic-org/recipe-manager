# Creating and removing Users

Self-registration is switched off. Users are created and removed by hand in the AWS console.

## Open the user pool

1. Sign in to the AWS console and switch to the region **Europe (Frankfurt) `eu-central-1`**.
2. Open **Amazon Cognito** and choose **User pools**.
3. Open the user pool of the stack. Its ID is the `UserPoolId` value printed by `pnpm run deploy`.
4. Choose **Users** in the left menu (under _User management_).

## Create a User

1. Choose **Create user**.
2. Set **Invitation message** to **Send an email invitation**.
3. Enter the **User name**. This is what the person types to sign in.
4. Enter the **Email address** and tick **Mark email address as verified**. Password reset sends a code to this address, and it only works when the address is verified.
5. Under **Temporary password**, choose **Generate a password** or set one yourself.
6. Choose **Create user**.

The person signs in with the user name and the temporary password from the invitation e-mail. The app then asks for a new password.

## Reset a password

- A User who forgot the password chooses **Forgot your password?** on the sign-in page and enters the code sent by e-mail.
- A signed-in User changes the password with **Change password** in the app.
- If the e-mail address no longer works, select the User in the console and choose **Actions** → **Reset password**, or delete and recreate the User.

## Remove a User

1. Select the User in the list.
2. Choose **Delete**, then confirm.

To block someone without deleting the User, choose **Actions** → **Disable user** instead. The User cannot sign in until the account is enabled again.

Removing a User does not touch the Recipes: the Collection belongs to the family, not to a User.
