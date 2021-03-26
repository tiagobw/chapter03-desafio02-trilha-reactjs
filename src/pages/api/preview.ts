import Prismic from '@prismicio/client';

import { linkResolver } from '../../helperFunctions/linkResolver';

const apiEndpoint = process.env.PRISMIC_API_ENDPOINT;
const accessToken = process.env.PRISMIC_ACCESS_TOKEN;

// Client method to query from the Prismic repo
const Client = (req: any = null): any => {
  // eslint-disable-next-line no-use-before-define
  return Prismic.client(apiEndpoint, createClientOptions(req, accessToken));
};

const createClientOptions = (req = null, prismicAccessToken = null): any => {
  const reqOption = req ? { req } : {};
  const accessTokenOption = prismicAccessToken
    ? { accessToken: prismicAccessToken }
    : {};
  return {
    ...reqOption,
    ...accessTokenOption,
  };
};

const Preview = async (req, res): Promise<any> => {
  const { token: ref, documentId } = req.query;
  const redirectUrl = await Client(req)
    .getPreviewResolver(ref, documentId)
    .resolve(linkResolver, '/');

  if (!redirectUrl) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  res.setPreviewData({ ref });
  res.writeHead(302, { Location: `${redirectUrl}` });
  return res.end();
};

export default Preview;
