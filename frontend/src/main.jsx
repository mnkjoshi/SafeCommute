import React from 'react'
import ReactDOM from 'react-dom/client'

import './stylesheets/root.css'
import './stylesheets/auth.css'

import Root from './routes/root.jsx'
import Auth from './routes/auth.jsx'
import Dashboard from './routes/dashboard.jsx'
import ErrorPage from './routes/error.jsx'

import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root/> ,
    errorElement: <ErrorPage/>,
  },
  {
    path: "/auth",
    element: <Auth/> ,
    errorElement: <ErrorPage/>,
  },
  {
    path: "/dashboard",
    element: <Dashboard/> ,
    errorElement: <ErrorPage/>,
  },
  // {
  //   path: "/watch",
  //   element: <Gaming/> ,
  //   errorElement: <ErrorPage/>,
  // },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
     <RouterProvider router={router}/>
  </React.StrictMode>,
)
