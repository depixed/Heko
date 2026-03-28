import { Html, Head, Main, Scripts } from 'expo-router';

export default function Root() {
  return (
    <Html lang="en">
      <Head>
        <title>HEKO – Groceries, Cashback, Referrals</title>
        <meta name="description" content="Shop groceries on HEKO and earn cashback, convert via referrals." />
        <meta name="theme-color" content="#0EA5E9" />
        <meta property="og:title" content="HEKO" />
        <meta property="og:description" content="Groceries + wallet rewards" />
        <meta property="og:type" content="website" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <body>
        <Main />
        <Scripts />
      </body>
    </Html>
  );
}

