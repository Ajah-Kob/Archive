import { APP_NAME } from '@/config/constants'

// Branded wrapper for all outbound mail. Mirrors the app's auth styling:
// #F8F7FF wash, white rounded card, #0F0E2E headings, and the prototype
// gradient CTA (#707dff → #a178cd → #fe6f6f, 7px radius). Content links
// render as buttons; everything else passes through untouched.
export function defaultEmailTemplate(content: string): string {
  return `<!doctype html>
  <html lang="en">
    <head>
      <!-- Required meta tags -->
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
      <style type="text/css">
        body {
          font-family: -apple-system, 'Segoe UI', Inter, Arial, Helvetica, sans-serif;
          background: #F8F7FF;
          line-height: 160%;
          font-size: 15px;
          color: #5a6382;
        }
        .re {
          margin: auto;
          background: #ffffff;
        }
        .email-body p {
          margin: 0 0 16px 0;
        }
        .email-body a {
          display: inline-block;
          padding: 12px 28px;
          margin: 8px 0 16px 0;
          border-radius: 7px;
                  background-image: linear-gradient(
          155deg,
          #707dff 0%,
          #a178cd 35%,
          #fe6f6f 200%
        );
          color: #ffffff !important;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
        }
        @media only screen and (max-width: 480px){
          .re,
          .re tbody,
          .re tbody tr {
            margin: auto;
            width: 100%;
            display: block;
          }
          .re__column {
            width:100% !important;
            display: block;
          }
          .re__image{
            height:auto !important;
            max-width:480px !important;
            width:100% !important;
          }

          .default,
          .default tbody {
            display: table;
          }
          .default tbody tr {
            margin: auto;
            width: 100%;
            display: table-row;
          }
        }
      </style>
      <title>${APP_NAME}</title>
    </head>
    <body style="background: #F8F7FF; padding-top: 30px; padding-bottom: 30px; padding-left: 15px; padding-right: 15px; font-size: 15px; color: #5a6382;">
      <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 560px; border-radius: 14px; box-shadow: 0 4px 24px rgba(112,125,255,0.12);" class="re">
        <!-- Brand bar -->
        <tr>
          <td height="6" style="font-size: 0; line-height: 0; background-color: #707dff; background-image: linear-gradient(90deg, #707dff 8%, #a178cd 59%, #fe6f6f 100%); border-radius: 14px 14px 0 0;">&nbsp;</td>
        </tr>
        <!-- Content -->
        <tr align="center" valign="top" width="100%" class="re__column">
          <td style="padding-top: 24px; padding-left: 32px; padding-right: 32px;">
            <table border="0" cellpadding="10" cellspacing="0" width="100%" class="default">
              <tr>
                <td align="center">
                  <p style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 6px; color: #0F0E2E;">
                    ${APP_NAME.toUpperCase()}
                  </p>
                </td>
              </tr>
            </table>

            <table border="0" cellpadding="0" cellspacing="0" width="100%" class="default">
              <tr>
                <td align="left" class="email-body" style="padding-top: 8px; padding-bottom: 8px;">
                  ${content}
                </td>
              </tr>
            </table>

          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td align="center" valign="top" width="100%" class="re__column" style="padding-bottom: 24px; padding-left: 32px; padding-right: 32px;">
            <p style="margin: 0; font-size: 12px; color: #9ea8c6;">Capstone Project Management Platform</p>
          </td>
        </tr>
      </table>
      <!-- Outside footer-->
      <table cellpadding="0" cellspacing="0" style="margin: 20px auto; text-align: center;">
        <tr>
          <td style="text-align: center; font-size: 13px; color: #9ea8c6;">
            <p style="margin:0;">Copyright &copy; ${new Date().getFullYear()} ${APP_NAME}</p>

          </td>
        </tr>
      </table>
    </body>
  </html>`
}
