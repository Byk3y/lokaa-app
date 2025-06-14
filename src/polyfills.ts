// Polyfill process
import process from 'process';
window.process = process;
 
// Polyfill global
(window as any).global = window; 