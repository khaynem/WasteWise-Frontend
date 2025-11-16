"use client"

import LocalGovernmentNavBar from './components/LocalGovernmentNavBar'
import BotpressWidget from "../components/BotpressWidget";

export default function Layout({ children }) {
  return (
    <>
      <LocalGovernmentNavBar />
      <BotpressWidget />
      {children}
    </>
  )
}
