import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';

import Header from '../../components/Header';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();
  const totalNumberOfWords = post.data.content.reduce((acc, cur) => {
    const bodyText = RichText.asText(cur.body);
    const numberOfWords = bodyText.trim().split(/\s+/).length;
    return acc + numberOfWords;
  }, 0);

  const readingTime = Math.ceil(totalNumberOfWords / 200);

  const headingAndBodyFormattedArray = post.data.content.map(postData => ({
    htmlBody: RichText.asHtml(postData.body),
    headingText: postData.heading,
  }));

  const first_publication_date_formatted = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  );

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  return (
    <>
      <Head>
        <title>{post.data.title} | spacetraveling</title>
      </Head>

      <Header />
      <div
        className={styles.banner}
        style={{ backgroundImage: `url(${post.data.banner.url})` }}
      />
      <main className={styles.container}>
        <article className={styles.post}>
          <h1>{post.data.title}</h1>
          <div className={commonStyles.iconsAndTextsOuterContainer}>
            <div className={commonStyles.iconAndTextContainer}>
              <FiCalendar className={commonStyles.icon} />
              <time>{first_publication_date_formatted}</time>
            </div>
            <div className={commonStyles.iconAndTextContainer}>
              <FiUser className={commonStyles.icon} />
              <p>{post.data.author}</p>
            </div>
            <div className={commonStyles.iconAndTextContainer}>
              <FiClock className={commonStyles.icon} />
              <p>{readingTime} min</p>
            </div>
          </div>
          {headingAndBodyFormattedArray.map(object => (
            <div key={object.headingText}>
              <h2>{object.headingText}</h2>
              <div
                className={styles.postContent}
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: object.htmlBody }}
              />
            </div>
          ))}
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 20,
    }
  );

  const paramsSlugs = posts.results.map(post => {
    return {
      params: { slug: String(post.uid) },
    };
  });

  return {
    paths: paramsSlugs,
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const { slug } = context.params;
  const prismic = getPrismicClient();

  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: response.data,
  };

  return {
    props: {
      post,
    },
    redirect: 60 * 60 * 24, // 24 hours
  };
};
