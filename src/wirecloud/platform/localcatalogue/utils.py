# -*- coding: utf-8 -*-

# Copyright (c) 2012-2015 CoNWeT Lab., Universidad Politécnica de Madrid

# This file is part of Wirecloud.

# Wirecloud is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# Wirecloud is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.

# You should have received a copy of the GNU Affero General Public License

from wirecloud.catalogue.utils import add_packaged_resource
from wirecloud.catalogue.models import CatalogueResource
from wirecloud.platform.localcatalogue.signals import resource_installed
from wirecloud.commons.utils.template import TemplateParser
from wirecloud.commons.utils.wgt import WgtFile


def install_resource(wgt_file, executor_user):

    if not isinstance(wgt_file, WgtFile):
        raise TypeError('wgt_file must be a WgtFile')

    file_contents = wgt_file.get_underlying_file()
    template_contents = wgt_file.get_template()

    template = TemplateParser(template_contents)
    resources = CatalogueResource.objects.filter(vendor=template.get_resource_vendor(), short_name=template.get_resource_name(), version=template.get_resource_version())[:1]

    # Create/recover catalogue resource
    if len(resources) == 1:
        resource = resources[0]
    else:
        resource = add_packaged_resource(file_contents, executor_user, wgt_file=wgt_file)

    return resource


def install_resource_to_user(user, **kwargs):

    executor_user = kwargs.get('executor_user', user)
    downloaded_file = kwargs.get('file_contents', None)

    resource = install_resource(downloaded_file, executor_user)
    if resource.users.filter(pk=user.pk).exists():
        added = False
    else:
        added = True
        resource.users.add(user)
        resource_installed.send(sender=resource, user=user)

    return added, resource


def install_resource_to_group(group, **kwargs):

    executor_user = kwargs.get('executor_user', None)
    downloaded_file = kwargs.get('file_contents', None)

    resource = install_resource(downloaded_file, executor_user)
    if resource.groups.filter(pk=group.pk).exists():
        added = False
    else:
        added = True
        resource.groups.add(group)
        resource_installed.send(sender=resource, group=group)

    return added, resource


def install_resource_to_all_users(**kwargs):

    executor_user = kwargs.get('executor_user', None)
    downloaded_file = kwargs.get('file_contents', None)

    resource = install_resource(downloaded_file, executor_user)
    if resource.public:
        added = False
    else:
        added = True
        resource.public = True
        resource.save()
        resource_installed.send(sender=resource)

    return added, resource
