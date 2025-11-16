"use client"

import BarangayNavBar from './components/BarangayNavBar'
import BotpressWidget from "../components/BotpressWidget";

export default function Layout({ children }) {
  return (
    <>
      <BarangayNavBar />
      <BotpressWidget />
      {children}
    </>
  )
}
