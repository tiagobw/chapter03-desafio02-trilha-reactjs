import { useEffect } from 'react';

import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';

import Header from '../../components/Header';
import { getPrismicClient } from '../../services/prismic';

import { linkResolver } from '../../helperFunctions/linkResolver';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
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
  preview: boolean;
  prevPostLink: string | null;
  nextPostLink: string | null;
  prevPost: Post | null;
  nextPost: Post | null;
}

export default function Post({
  post,
  preview,
  prevPostLink,
  nextPostLink,
  prevPost,
  nextPost,
}: PostProps): JSX.Element {
  const router = useRouter();

  useEffect(() => {
    const script = document.createElement('script');
    const anchor = document.getElementById('inject-comments-for-uterances');
    script.setAttribute('src', 'https://utteranc.es/client.js');
    script.setAttribute('crossorigin', 'anonymous');
    script.setAttribute('async', 'true');
    script.setAttribute('repo', 'tiagobw/chapter03-desafio02-trilha-reactjs');
    script.setAttribute('issue-term', 'pathname');
    script.setAttribute('theme', 'dark-blue');
    anchor.appendChild(script);
  }, []);

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

  const last_publication_date_formatted = format(
    new Date(post.last_publication_date),
    "'* editado em' dd MMM yyyy', às' HH:ss",
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
          {post.first_publication_date === post.last_publication_date && (
            <p className={styles.editedDate}>
              {last_publication_date_formatted}
            </p>
          )}
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
        {prevPostLink || nextPostLink ? (
          <>
            <hr className={styles.horizontalLine} />
            <div className={styles.prevNextContainer}>
              {prevPostLink && (
                <div className={styles.prevNextButton}>
                  <Link href={`${prevPostLink}`}>
                    <a>
                      <h3>{prevPost.data.title}</h3>
                      <p>Post anterior</p>
                    </a>
                  </Link>
                </div>
              )}
              {nextPostLink && (
                <div
                  className={`${styles.prevNextButton} ${styles.prevNextButtonRight}`}
                >
                  <Link href={`${nextPostLink}`}>
                    <a>
                      <h3>{nextPost.data.title}</h3>
                      <p>Próximo post</p>
                    </a>
                  </Link>
                </div>
              )}
            </div>
          </>
        ) : (
          <hr className={`${styles.horizontalLine} ${styles.transparent}`} />
        )}
        <div className={styles.utteranceContainer}>
          <div id="inject-comments-for-uterances" />
        </div>
        {preview && (
          <aside className={commonStyles.previewButton}>
            <Link href="/api/exit-preview">
              <div className={commonStyles.anchorContainer}>
                <a>Sair do modo Preview</a>
              </div>
            </Link>
          </aside>
        )}
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

export const getStaticProps: GetStaticProps<PostProps> = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;
  const prismic = getPrismicClient();

  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const prevPost =
    (
      await prismic.query(Prismic.predicates.at('document.type', 'posts'), {
        pageSize: 1,
        after: `${response.id}`,
        orderings: '[document.first_publication_date desc]',
      })
    ).results[0] || null;

  const nextPost =
    (
      await prismic.query(Prismic.predicates.at('document.type', 'posts'), {
        pageSize: 1,
        after: `${response.id}`,
        orderings: '[document.first_publication_date]',
      })
    ).results[0] || null;

  let prevPostLink = null;
  let nextPostLink = null;

  if (prevPost) {
    prevPostLink = linkResolver(prevPost);
  }

  if (nextPost) {
    nextPostLink = linkResolver(nextPost);
  }

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: response.data,
  };

  return {
    props: {
      post,
      preview,
      prevPostLink,
      nextPostLink,
      prevPost,
      nextPost,
    },
    revalidate: 60 * 60 * 24, // 24 hours
  };
};
