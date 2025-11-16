"use client"

import NonGovernmentNavBar from './components/NonGovernmentNavBar'
import BotpressWidget from "../components/BotpressWidget";

export default function Layout({ children }) {
  return (
    <>
      <NonGovernmentNavBar />
      <BotpressWidget />
      {children}
    </>
  )
}
