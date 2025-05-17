import { Routes } from '@angular/router';
import { Access } from './access';
import { Login } from './login';
import { Error } from './error';
import { SigninComponent } from './signin/signin.component';

export default [
    { path: 'access', component: Access },
    { path: 'error', component: Error },
    { path: 'login', component: Login },
    {path: 'signin', data: { breadcrumb: 'Signin' }, component: SigninComponent},
] as Routes;
