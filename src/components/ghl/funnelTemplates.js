// Starter HTML templates for the Funnel & Site Builder. Each is a complete,
// responsive single-file page branded for Lead Gen Near You.
export const TEMPLATES = [
  {
    id: 'local-lead',
    name: 'Local Lead Landing',
    description: 'Hero + benefits + 3-step + lead capture form',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lead Gen Near You — Get More Local Jobs</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #111; background: #fff; }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 0 20px; }
  header { background: #0a0a0a; color: #fff; padding: 18px 0; }
  header .wrap { display: flex; align-items: center; justify-content: space-between; }
  .logo { font-size: 20px; font-weight: 700; }
  .logo span { color: #C89B3C; }
  .hero { background: radial-gradient(circle at 80% 30%, #C89B3C33, transparent 40%), #0a0a0a; color: #fff; padding: 70px 0; }
  .hero h1 { font-size: 48px; line-height: 1.1; max-width: 600px; letter-spacing: -0.02em; }
  .hero h1 span { color: #E7C86E; }
  .hero p { color: #bbb; font-size: 18px; margin: 16px 0 0; max-width: 520px; }
  .grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 40px; align-items: center; }
  .card { background: #fff; border-radius: 12px; padding: 28px; box-shadow: 0 20px 60px rgba(0,0,0,.3); }
  .card h3 { font-size: 22px; margin-bottom: 6px; }
  .card p { color: #777; font-size: 14px; margin-bottom: 18px; }
  .field { margin-bottom: 12px; }
  .field input, .field select { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 15px; }
  .btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #E7C86E, #C89B3C); color: #111; border: 0; border-radius: 6px; font-weight: 700; font-size: 16px; cursor: pointer; }
  .benefits { padding: 60px 0; }
  .benefits h2 { font-size: 34px; text-align: center; margin-bottom: 30px; }
  .row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .b { padding: 24px; border: 1px solid #eee; border-radius: 10px; text-align: center; }
  .b .ic { font-size: 32px; }
  .b h4 { margin: 10px 0 6px; }
  .b p { color: #777; font-size: 14px; }
  .steps { background: #f8f7f4; padding: 60px 0; }
  .steps h2 { text-align: center; font-size: 34px; margin-bottom: 30px; }
  .srow { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .step { text-align: center; }
  .step .n { width: 44px; height: 44px; border-radius: 50%; background: #C89B3C; color: #111; display: grid; place-items: center; font-weight: 700; margin: 0 auto 12px; }
  footer { background: #0a0a0a; color: #999; padding: 24px 0; text-align: center; font-size: 13px; }
  @media(max-width:760px){ .grid,.row,.srow{ grid-template-columns: 1fr; } .hero h1{ font-size: 34px; } }
</style>
</head>
<body>
<header><div class="wrap"><div class="logo">Lead Gen <span>Near You</span></div><a href="#lead" style="color:#E7C86E">Get Started</a></div></header>

<section class="hero">
  <div class="wrap grid">
    <div>
      <h1>Get More <span>Booked Jobs</span> Without Chasing Cold Leads</h1>
      <p>We connect local service businesses with ready-to-buy customers searching in your area. No ads to manage — just pure performance.</p>
    </div>
    <div class="card" id="lead">
      <h3>Get Your Free Audit</h3>
      <p>See exactly how you rank locally — free, no obligation.</p>
      <form data-ghl-form="FORM_ID_HERE" data-ghl-redirect="#thanks">
        <div class="field"><input name="first_name" placeholder="First Name" required></div>
        <div class="field"><input name="last_name" placeholder="Last Name"></div>
        <div class="field"><input name="email" type="email" placeholder="Email Address" required></div>
        <div class="field"><input name="phone" type="tel" placeholder="Phone Number"></div>
        <div class="field"><input name="company" placeholder="Business Name"></div>
        <button class="btn" type="submit">Get My Free Audit</button>
      </form>
    </div>
  </div>
</section>

<section class="benefits">
  <div class="wrap">
    <h2>Our Lead Generation Arsenal</h2>
    <div class="row">
      <div class="b"><div class="ic">📍</div><h4>GBP Optimization</h4><p>Rank in the Map Pack where 70% of local clicks happen.</p></div>
      <div class="b"><div class="ic">🌐</div><h4>Geo-Targeted Pages</h4><p>Landing pages for every town you service.</p></div>
      <div class="b"><div class="ic">🤖</div><h4>Follow-Up CRM</h4><p>Automated follow-up so no lead goes cold.</p></div>
    </div>
  </div>
</section>

<section class="steps">
  <div class="wrap">
    <h2>The 3-Step Success Path</h2>
    <div class="srow">
      <div class="step"><div class="n">1</div><h4>Pinpoint Your Territory</h4><p>We identify your most profitable service areas.</p></div>
      <div class="step"><div class="n">2</div><h4>Capture High-Intent Traffic</h4><p>Intercept customers the moment they need a pro.</p></div>
      <div class="step"><div class="n">3</div><h4>Close and Scale</h4><p>Leads flow into your CRM and book automatically.</p></div>
    </div>
  </div>
</section>

<footer>© Lead Gen Near You — leadgennearyou.com</footer>
</body>
</html>`,
  },
  {
    id: 'thank-you',
    name: 'Thank You Page',
    description: 'Confirmation page after form submission',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Thank You — Lead Gen Near You</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; background: radial-gradient(circle at 50% 30%, #C89B3C22, transparent 40%), #0a0a0a; color: #fff; min-height: 100vh; display: grid; place-items: center; text-align: center; padding: 20px; }
  .card { max-width: 560px; }
  .check { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #E7C86E, #C89B3C); display: grid; place-items: center; margin: 0 auto 24px; font-size: 40px; color: #111; }
  h1 { font-size: 42px; letter-spacing: -0.02em; }
  h1 span { color: #E7C86E; }
  p { color: #bbb; font-size: 18px; margin: 16px 0 28px; }
  a { display: inline-block; padding: 14px 28px; background: #fff; color: #111; border-radius: 6px; text-decoration: none; font-weight: 700; }
</style>
</head>
<body>
  <div class="card">
    <div class="check">✓</div>
    <h1>You're <span>All Set!</span></h1>
    <p>Thanks for reaching out. A local growth strategist will perform your free audit and be in touch within 24 hours.</p>
    <a href="https://leadgennearyou.com">Back to Home</a>
  </div>
</body>
</html>`,
  },
];

export default TEMPLATES;