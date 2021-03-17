import {
  Button,
  Form,
  Input,
  Table,
  Layout,
  Menu,
  Select,
  Avatar,
  Image,
} from "antd";
import {
  GithubOutlined,
} from "@ant-design/icons";
import {
  Issue,
  SavedTrackedErrors,
  TrackErrorOptions,
  trackErrors,
} from "error-issue-tracker-sdk";
import { Fragment, useEffect, useState } from "react";
import "./App.css";
import {
  ErrorFirestore,
  getGithubUser,
  loginWithGithub,
  logoutWithGithub,
  User,
} from "./firebase";
import GithubIssueClient, { Repository } from "./github";

const { Header, Content, Footer } = Layout;

const { Option } = Select;
const database = new ErrorFirestore();

const tailLayout = {
  wrapperCol: { offset: 8, span: 16 },
};

const centered = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
type Record = {
  id: string;
  name: string;
  issue: Issue;
  newOccurrences: number;
  totalOccurrences: number;
  source: SavedTrackedErrors;
};

function App() {
  const [errorStatus, setErrorStatus] = useState<string | undefined>();
  const [datasource, setDatasource] = useState<Record[]>([]);
  const [currentUser, setCurrentUser] = useState<User | undefined>();
  const [repos, setRepos] = useState<Repository[]>();
  const [projectId, setProjectId] = useState<string | undefined>();
  const client = () => currentUser && new GithubIssueClient(currentUser.githubToken)
  const fillDatasources = (errors: SavedTrackedErrors[]) =>
    setDatasource(
      errors.map((e) => ({
        id: e.id,
        name: e.name,
        issue: e.issue,
        newOccurrences: e.newOccurrences.length,
        totalOccurrences: e.occurrences.length + e.newOccurrences.length,
        source: e,
      }))
    );
  useEffect(() => {
    !currentUser && getGithubUser().then(setCurrentUser);
    const unsubscribe = projectId
      ? database.onRead(projectId, fillDatasources)
      : () => {};
    return unsubscribe;
  }, [currentUser, projectId]);
  useEffect(() => {
    !repos && client()?.getRepositories().then(setRepos);
  }, [repos]);

  const onFinish = async (values: any) => {
    const githubClient = client()
    if (!githubClient || !projectId)
      throw new Error("Need to be login to use this feature");
    const options: TrackErrorOptions = {
      database,
      issueClient: githubClient,
      projectId,
    };
    trackErrors(
      [
        {
          message: values["error-message"],
          timestamp: new Date().getTime(),
        },
      ],
      options
    ).catch((e) => setErrorStatus(e.message));
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log("Failed:", errorInfo);
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Github issue",
      dataIndex: "issue",
      key: "issue",
      render: ({ id, url }: Issue) => <a href={url}>{id}</a>,
    },
    {
      title: "New occurrences",
      dataIndex: "newOccurrences",
      key: "newOccurrences",
    },

    {
      title: "Total occurences",
      dataIndex: "totalOccurrences",
      key: "totalOccurrences",
    },
    {
      title: "Action",
      key: "action",
      render: (text: string, record: Record) => (
        <Button
          type="link"
          onClick={() =>
            database
              .delete(record.source)
              .then(() => client()?.closeIssue(record.source))
          }
        >
          Close and delete
        </Button>
      ),
    },
  ];

  return (
    <Layout className="layout">
      <Header>
        <div className="logo">Demo Error Issue Tracker</div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectable={false}
          style={{ float: "right" }}
        >
          {currentUser ? (
            <Menu.Item
              key="logout"
              icon={<Avatar src={<Image src={currentUser.photoUrl} />} />}
              onClick={() =>
                logoutWithGithub().then(() => setCurrentUser(undefined))
              }
            >
              Log out
            </Menu.Item>
          ) : (
            <Menu.Item
              key="login"
              icon={<GithubOutlined />}
              onClick={loginWithGithub}
            >
              Log in with Github
            </Menu.Item>
          )}
        </Menu>
      </Header>
      <Content className="site-layout-content">
        <div>
          <h1 style={{ textAlign: "center" }}>
            Welcome to the demo of the{" "}
            <a href="https://github.com/ludorival/error-issue-tracker">
              error-issue-tracker-sdk !
            </a>
          </h1>
          <div style={centered}>
            <div>
              <p>
                {" "}
                This demo shows you an usage of the{" "}
                <a href="https://github.com/ludorival/error-issue-tracker">
                  error-issue-tracker-sdk !
                </a>
                <p>
                  It is based on{" "}
                  <ul>
                    <li>
                      <b>
                        <a href="https://octokit.github.io/rest.js/v18/">
                          Github SDK
                        </a>
                      </b>{" "}
                      to track the issues
                    </li>
                    <li>
                      <b>
                        <a href="https://firebase.google.com/docs/reference/js">
                          Firebase
                        </a>
                      </b>{" "}
                      to store the mapping between the errors and the relative
                      issues.
                    </li>
                  </ul>
                </p>
              </p>
              <p>
                This demo uses your Github account to list your repository <i>
                  (None
                  of your personnal data will be stored)
                </i>.
                <ul>
                  <li>
                    Select a repository where the errors should be tracked
                  </li>
                  <li>
                    Write and push a message to simulate an error to track
                  </li>
                  <li>
                    Try by putting the same error and you will see that the same
                    issue will be recycled
                  </li>
                </ul>
              </p>
            </div>
          </div>
        </div>
        <hr />
        {!currentUser ? (
          <div style={{...centered, flexDirection: 'column',}}>
            <div style={{ fontWeight: 800 , padding: 24, fontSize:'2em'}}>Let's get started ! 👇</div>
            <Button
              type="primary"
              size={"large"}
              icon={<GithubOutlined />}
              onClick={loginWithGithub}
            >
              Log in with Github
            </Button>
          </div>
        ) : (
          <Fragment>
            <Form
              style={{ padding: 16 }}
              labelCol={{ span: 8 }}
              wrapperCol={{ span: 8 }}
              name="basic"
              initialValues={{ remember: true }}
              onFinish={onFinish}
              onFinishFailed={onFinishFailed}
            >
              <Form.Item
                name="repository"
                label="Github repository"
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  style={{ width: 200 }}
                  placeholder="Select a repository"
                  onChange={(value) => setProjectId(value.toString())}
                >
                  {repos?.map((repo) => (
                    <Option key={repo.fullName} value={repo.fullName}>
                      {repo.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                label="Enter an example of error"
                name="error-message"
                validateStatus={errorStatus ? "error" : undefined}
                help={errorStatus}
                rules={[{ required: true, message: "Please input a message!" }]}
              >
                <Input />
              </Form.Item>

              <Form.Item {...tailLayout}>
                <Button type="primary" htmlType="submit">
                  Push
                </Button>
              </Form.Item>
            </Form>
            <Table dataSource={datasource} columns={columns} />
          </Fragment>
        )}
      </Content>
      <Footer style={{ textAlign: "center" }}>
        Ant Design ©2018 Created by Ant UED
        <p><a href="https://www.termsfeed.com/live/269deb2a-4a39-4ce1-8bd2-3a4f1c3bbf54">Private Policy</a></p>
      </Footer>
    </Layout>
  );
}

export default App;
