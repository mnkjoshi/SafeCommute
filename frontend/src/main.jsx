import React from 'react'
import ReactDOM from 'react-dom/client'

import './stylesheets/root.css'

import Root from './routes/root.jsx'
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
    children: [
      // {
      //   index: true,
      //   element: <Index/>
      // },
      // {
      //   path: "/projects",
      //   element: <Projects/>
      // },
      // {
      //   path: "/cyber",
      //   element: <Cyber/>
      // },
      // {
      //   path: "/resume",
      //   element: <Resume/>
      // },
      // {
      //   path: "/resources",
      //   element: <Resources/>
      // },
      // {
      //   path: "/portal",
      //   element: <Portal/>
      // },
    ]
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
