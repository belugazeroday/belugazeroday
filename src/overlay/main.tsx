import React from 'react'
import { createRoot } from 'react-dom/client'
import OverlayApp from './OverlayApp'
import './styles/overlay.css'

const container = document.getElementById('root')!
const root = createRoot(container)
root.render(<OverlayApp />)
