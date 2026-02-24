export function accountDisconnectEmail(params: {
  userName: string;
  institutionName: string;
}): { subject: string; html: string } {
  const { userName, institutionName } = params;

  const subject = `Your ${institutionName} account has been disconnected`;

  const html =
    `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta name="viewport" content="width=device-width" />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>Reconnect Your Bank Account</title>
    <style>
      * {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      blockquote,h1,h2,h3,img,li,ol,p,ul{margin-top:0;margin-bottom:0}
      @media only screen and (max-width:425px){
        .mobile-padding{padding:20px!important}
        .mobile-outer{padding:4px!important}
      }
    </style>
  </head>
  <body style="margin:0;background:#ffffff;">
    <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;min-width:320px;width:100%;margin-left:auto;margin-right:auto;padding:12px;" class="mobile-outer">
      <tbody>
        <tr style="width:100%">
          <td>
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff;padding:40px;border-radius:8px;" class="mobile-padding">
              <tbody>
                <tr>
                  <td>
                    <p style="font-size:16px;line-height:1.6;color:#1c1917;margin:0 0 16px 0;">Hi ${userName},</p>

                    <p style="font-size:16px;line-height:1.6;color:#1c1917;margin:0 0 16px 0;">
                      Your <strong>${institutionName}</strong> connection has been disconnected.
                      This usually happens when your bank requires you to re-authenticate.
                    </p>

                    <p style="font-size:16px;line-height:1.6;color:#1c1917;margin:0 0 16px 0;">
                      To continue syncing your transactions, open the app and reconnect your account.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:16px;border-top:1px solid #ffffff;">
                    <p style="font-size:14px;line-height:1.6;color:#9a9a9a;margin:16px 0 0 0;">&mdash; OpenFinance</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`.trim();

  return { subject, html };
}
