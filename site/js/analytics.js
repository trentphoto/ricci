// Google Analytics 4 — single source of truth for the Measurement ID.
var GA_MEASUREMENT_ID = 'G-JEWKHMWRVP';

window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', GA_MEASUREMENT_ID);

// Load the gtag library.
var s = document.createElement('script');
s.async = true;
s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
document.head.appendChild(s);
