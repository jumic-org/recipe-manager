import { Injectable } from '@angular/core';
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  CognitoUserSession
} from 'amazon-cognito-identity-js';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userPool: CognitoUserPool;
  private readonly authenticatedSubject = new BehaviorSubject<boolean>(false);
  private readonly sessionCheckedSubject = new BehaviorSubject<boolean>(false);

  /** Emits true once the initial session check has completed. */
  readonly sessionChecked$: Observable<boolean> = this.sessionCheckedSubject.asObservable();

  constructor() {
    this.userPool = new CognitoUserPool({
      UserPoolId: environment.userPoolId,
      ClientId: environment.userPoolClientId
    });
    const currentUser = this.userPool.getCurrentUser();
    if (currentUser) {
      currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (!err && session && session.isValid()) {
          this.authenticatedSubject.next(true);
        }
        this.sessionCheckedSubject.next(true);
      });
    } else {
      this.sessionCheckedSubject.next(true);
    }
  }

  signUp(email: string, password: string): Observable<void> {
    return from(
      new Promise<void>((resolve, reject) => {
        const attributes = [new CognitoUserAttribute({ Name: 'email', Value: email })];
        this.userPool.signUp(email, password, attributes, [], (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      })
    );
  }

  confirmSignUp(email: string, code: string): Observable<void> {
    return from(
      new Promise<void>((resolve, reject) => {
        const user = new CognitoUser({
          Username: email,
          Pool: this.userPool
        });
        user.confirmRegistration(code, true, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      })
    );
  }

  signIn(email: string, password: string): Observable<void> {
    return from(
      new Promise<void>((resolve, reject) => {
        const user = new CognitoUser({
          Username: email,
          Pool: this.userPool
        });
        const authDetails = new AuthenticationDetails({
          Username: email,
          Password: password
        });
        user.authenticateUser(authDetails, {
          onSuccess: () => {
            this.authenticatedSubject.next(true);
            resolve();
          },
          onFailure: (err) => {
            reject(err);
          }
        });
      })
    );
  }

  signOut(): void {
    const user = this.userPool.getCurrentUser();
    if (user) {
      user.signOut();
    }
    this.authenticatedSubject.next(false);
  }

  getIdToken(): Observable<string | null> {
    const user = this.userPool.getCurrentUser();
    if (!user) {
      return of(null);
    }
    return from(
      new Promise<string | null>((resolve) => {
        user.getSession((err: Error | null, session: CognitoUserSession | null) => {
          if (err || !session || !session.isValid()) {
            resolve(null);
          } else {
            resolve(session.getIdToken().getJwtToken());
          }
        });
      })
    );
  }

  isAuthenticated(): Observable<boolean> {
    return this.authenticatedSubject.asObservable();
  }

  isAuthenticatedSync(): boolean {
    return this.authenticatedSubject.getValue();
  }

  getCurrentUser(): CognitoUser | null {
    return this.userPool.getCurrentUser();
  }
}
