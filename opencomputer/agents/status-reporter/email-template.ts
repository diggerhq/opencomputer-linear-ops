export const statusEmailTemplateGuide = String.raw`
Follow this reference layout closely. Replace every {{placeholder}} with
HTML-escaped report data and omit empty sections. Do not output the comments.

<!-- Outer canvas and centered card -->
<div style="margin:0;padding:24px;background:#f4f5f7;color:#171717;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.5">
  <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
    <div style="padding:28px 32px;background:#171717;color:#ffffff">
      <div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#c4b5fd">OpenComputer Reporter</div>
      <h1 style="margin:8px 0 4px;font-size:26px;line-height:1.2">Engineering status</h1>
      <div style="font-size:14px;color:#d1d5db">{{report date and timezone}} · {{freshness label and source-sync time}}</div>
    </div>

    <div style="padding:24px 32px">
      <!-- Metrics use a presentation table for broad email-client support. -->
      <table role="presentation" style="width:100%;border-collapse:separate;border-spacing:8px 0;margin:0 -8px 28px">
        <tr>
          <td style="width:25%;padding:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px"><div style="font-size:12px;color:#6b7280">Active</div><div style="font-size:22px;font-weight:700">{{active}}</div></td>
          <td style="width:25%;padding:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px"><div style="font-size:12px;color:#6b7280">Blocked</div><div style="font-size:22px;font-weight:700">{{blocked}}</div></td>
          <td style="width:25%;padding:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px"><div style="font-size:12px;color:#6b7280">Stale</div><div style="font-size:22px;font-weight:700">{{stale}}</div></td>
          <td style="width:25%;padding:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px"><div style="font-size:12px;color:#6b7280">Completed</div><div style="font-size:22px;font-weight:700">{{completed}}</div></td>
        </tr>
      </table>

      <h2 style="margin:0 0 12px;font-size:18px">Needs attention</h2>
      <table style="width:100%;border-collapse:collapse;margin:0 0 28px;font-size:14px">
        <thead><tr style="background:#f9fafb"><th align="left" style="padding:10px;border-bottom:1px solid #e5e7eb;color:#6b7280">Issue</th><th align="left" style="padding:10px;border-bottom:1px solid #e5e7eb;color:#6b7280">Why</th><th align="left" style="padding:10px;border-bottom:1px solid #e5e7eb;color:#6b7280">Status</th></tr></thead>
        <tbody>
          <tr><td style="padding:12px 10px;border-bottom:1px solid #eef0f2"><a href="{{recorded Linear URL}}" style="color:#5b21b6;font-weight:700;text-decoration:none">{{ISSUE-ID}}</a><div style="margin-top:3px;color:#4b5563">{{escaped title}}</div></td><td style="padding:12px 10px;border-bottom:1px solid #eef0f2">{{concise reason}}</td><td style="padding:12px 10px;border-bottom:1px solid #eef0f2"><span style="display:inline-block;padding:3px 8px;border-radius:999px;background:#ede9fe;color:#5b21b6;font-size:12px;font-weight:700">{{Grounded / Blocked / Review}}</span></td></tr>
        </tbody>
      </table>

      <!-- Repeat the same three-column table style for stale/unassigned and
           recently completed. Every issue ID is a link to its recorded URL. -->
      {{stale and unassigned table}}
      {{recently completed table}}

      <div style="margin-top:28px;padding:20px;background:#faf5ff;border-left:4px solid #7c3aed;border-radius:8px">
        <h2 style="margin:0 0 10px;font-size:18px">Next actions</h2>
        <ol style="margin:0;padding-left:20px">{{linked action items}}</ol>
      </div>
    </div>

    <div style="padding:18px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280">
      Generated from {{team keys}} · Source sync {{source sync id}} · Report {{report id}}
    </div>
  </div>
</div>

Rules:
- Keep the visual hierarchy and colors above; do not invent a different theme.
- Use table rows, not prose blocks, for issue collections.
- Put the issue identifier and recorded Linear URL in the first cell.
- Use concise titles and reasons so rows scan easily on mobile.
- Use green (#166534 on #dcfce7) for completed, amber (#92400e on #fef3c7)
  for stale/review, red (#991b1b on #fee2e2) for blocked, and purple for
  grounded/ready.
- Do not label a sync fresh when it is older than the configured freshness
  threshold.
`;
