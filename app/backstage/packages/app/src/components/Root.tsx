import React, { PropsWithChildren } from 'react';
import { Link, makeStyles } from '@material-ui/core';
import HomeIcon from '@material-ui/icons/Home';
import ExtensionIcon from '@material-ui/icons/Extension';
import LibraryBooks from '@material-ui/icons/LibraryBooks';
import CreateComponentIcon from '@material-ui/icons/AddCircleOutline';
import LogoFull from './LogoFull';
import {
  Sidebar,
  SidebarPage,
  SidebarItem,
  SidebarDivider,
  SidebarSpace,
  SidebarGroup,
} from '@backstage/core-components';

export const Root = ({ children }: PropsWithChildren<{}>) => (
  <SidebarPage>
    <Sidebar>
      <LogoFull />
      <SidebarDivider />
      <SidebarGroup label="Menu" icon={<HomeIcon />}>
        <SidebarItem icon={HomeIcon} to="catalog" text="Software Catalog" />
        <SidebarItem icon={CreateComponentIcon} to="create" text="Create... (Golden Paths)" />
        <SidebarItem icon={LibraryBooks} to="docs" text="TechDocs" />
      </SidebarGroup>
      <SidebarSpace />
      <SidebarDivider />
    </Sidebar>
    {children}
  </SidebarPage>
);
