"use client"

import BusinessesNavBar from './components/BusinessesNavBar'
import BotpressWidget from "../components/BotpressWidget";

export default function Layout({ children }) {
  return (
    <>
      <BusinessesNavBar />
      <BotpressWidget />
      {children}
    </>
  )
}
