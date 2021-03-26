import { useState } from 'react';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import Prismic from '@prismicio/client';

import { FiCalendar, FiUser } from 'react-icons/fi';

import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: boolean;
}

export default function Home(props: HomeProps): JSX.Element {
  const {
    postsPagination: { next_page, results },
    preview,
  } = props;

  const [stateNextPage, setStateNextPage] = useState(next_page);
  const [stateResults, setStateResults] = useState(results);

  function handleFetchNextPageResults(): void {
    if (stateNextPage) {
      fetch(stateNextPage)
        .then(response => response.json())
        .then(data => {
          setStateNextPage(data.next_page);
          setStateResults(prevStateResults => [
            ...prevStateResults,
            ...data.results,
          ]);
        });
    }
  }

  return (
    <>
      <Head>
        <title>Home | spacetraveling</title>
      </Head>

      <main className={styles.container}>
        <div className={styles.innerContainer}>
          <img src="/images/logo.svg" alt="logo" />
          <div className={styles.posts}>
            {stateResults.map(
              ({
                uid,
                first_publication_date,
                data: { title, subtitle, author },
              }) => {
                const first_publication_date_formatted = format(
                  new Date(first_publication_date),
                  'dd MMM yyyy',
                  {
                    locale: ptBR,
                  }
                );

                return (
                  <Link key={uid} href={`/post/${uid}`}>
                    <a>
                      <strong>{title}</strong>
                      <p>{subtitle}</p>
                      <div className={commonStyles.iconsAndTextsOuterContainer}>
                        <div className={commonStyles.iconAndTextContainer}>
                          <FiCalendar className={commonStyles.icon} />
                          <time>{first_publication_date_formatted}</time>
                        </div>
                        <div className={commonStyles.iconAndTextContainer}>
                          <FiUser className={commonStyles.icon} />
                          <p>{author}</p>
                        </div>
                      </div>
                    </a>
                  </Link>
                );
              }
            )}
          </div>
          {stateNextPage && (
            <button type="button" onClick={handleFetchNextPageResults}>
              Carregar mais posts
            </button>
          )}
          {preview && (
            <aside className={commonStyles.previewButton}>
              <Link href="/api/exit-preview">
                <div className={commonStyles.anchorContainer}>
                  <a>Sair do modo Preview</a>
                </div>
              </Link>
            </aside>
          )}
        </div>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async ({
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 2,
      ref: previewData?.ref ?? null,
    }
  );

  const posts: Post[] = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  const postsPagination: PostPagination = {
    next_page: postsResponse.next_page,
    results: posts,
  };

  return {
    props: {
      postsPagination,
      preview,
    },
    redirect: 60 * 60 * 24, // 24 hours
  };
};
